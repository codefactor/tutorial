import { ethers } from "hardhat";
import { initLandscape } from "../scripts/deploy";
import { units } from "./utils";

async function main() {
  const [signer] = await ethers.getSigners();
  const landscape = await initLandscape(signer, {
    A: units(150),
    B: units(150)
  }, [{
    pairs: [{
      reserves: [units(100), units(100)],
      symbols: ["A", "B"]
    }]
  }]);
  console.log(`Landscape is deployed: ${JSON.stringify(landscape, null, 2)}`);
}

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
