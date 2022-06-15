import { expect } from "chai";
import { ethers } from "hardhat";
import { getPair, initLandscape, tokenBalanceOf } from "../scripts/deploy";
import { units } from "../scripts/utils";

describe("Uniswap", function () {
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
