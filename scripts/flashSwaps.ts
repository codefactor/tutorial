import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract } from "ethers";
import { getOutputAmount, units } from "./utils";
import { abi as PairABI } from "../artifacts/@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Pair.sol/IUniswapV2Pair.json";
import { IUniswapV2Pair } from "../typechain";
import { ethers } from "hardhat";
import { getReserves, tokenBalanceOf } from "./deploy";

/**
 * @return the profit
 */
export async function executeSimpleFlash(
  signer: SignerWithAddress,
  flashAddress: string,
  tokens: [string, string],
  pairs: [string, string],
  inputAmount: BigNumber
): Promise<BigNumber> {
  const is0 = tokens[0].toLowerCase() < tokens[1].toLowerCase();
  const pairContract = new Contract(pairs[0], PairABI, signer) as IUniswapV2Pair;
  const reserves = await getReserves(pairs[0]);
  if (!is0) {
    reserves.reverse();
  }
  const amountOut = getOutputAmount(
    reserves,
    inputAmount
  );
  const initBalance = await tokenBalanceOf(signer.address, tokens[0]);
  const transaction = await pairContract.swap(
    is0 ? 0 : amountOut,
    is0 ? amountOut : 0,
    flashAddress,
    ethers.utils.defaultAbiCoder.encode(["address", "address", "address", "uint256"], [
      pairs[1], // nextPair
      tokens[0], // inputToken
      tokens[1], // outputToken
      inputAmount
    ]),
    {
      gasLimit: 1_000_000 // you should calculate this to be as little as possible
    }
  );
  await transaction.wait();
  const finalBalance = await tokenBalanceOf(signer.address, tokens[0]);
  return finalBalance.sub(initBalance);
}