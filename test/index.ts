import { expect } from "chai";
import { ethers } from "hardhat";
import { deploySimpleFlash, getPair, getPairAddress, initLandscape, initOpportunity, tokenBalanceOf } from "../scripts/deploy";
import { executeSimpleFlash } from "../scripts/flashSwaps";
import { getCurrencyString, units } from "../scripts/utils";

describe("Uniswap", function () {
  it("Should make a profit using the flash swap contract", async () => {
    const [signer] = await ethers.getSigners();
    const landscape = await initOpportunity(signer);
    console.log("Landscape:", landscape);
    const { tokens: { A, B }, exchanges } = landscape;
    const tokens = [B, A] as [string, string];
    const profit = await executeSimpleFlash(
      signer,
      await deploySimpleFlash(),
      tokens,
      await Promise.all(exchanges.map(({factory}) => getPairAddress(factory, tokens))) as [string, string],
      units(10)
    );
    console.log(`The profit was ${getCurrencyString(profit, "B")}`);
    expect(profit.gt(0), "The profit should be greater than 0").to.be.true;
  });

  it("Should deploy and initialize uniswap", async function () {
    const [signer] = await ethers.getSigners();
    const { exchanges, tokens } = await initLandscape(signer, {
      A: units(150),
      B: units(150)
    }, [{
      pairs: [{
        reserves: [units(100), units(100)],
        symbols: ["A", "B"]
      }]
    }]);
    expect(exchanges.length).to.be.equal(1);
    const [{ factory }] = exchanges;
    const pairAddress = await getPair(signer, factory, tokens.A, tokens.B);
    await Promise.all(["A", "B"].map(async (symbol) => {
      const signerBalance = await tokenBalanceOf(signer.address, tokens[symbol]);
      const pairBalance = await tokenBalanceOf(pairAddress, tokens[symbol]);
      expect(signerBalance).to.be.equal(units(50));
      expect(pairBalance).to.be.equal(units(100));
    }));
  });
});
