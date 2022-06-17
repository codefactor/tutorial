import { BigNumber, BigNumberish } from "ethers";
import { ethers } from "hardhat";

export function units(value: BigNumberish, decimals = 18): BigNumber {
  return ethers.utils.parseUnits(value.toString(), decimals);
}

export function getCurrencyString(amount: BigNumberish, symbol: string, decimals = 18): string {
  return `${ethers.utils.formatUnits(amount, decimals)} ${symbol}`;
}

export function getOutputAmount(
  [inputReserve, outputReserve]: [BigNumber, BigNumber], // input followed by output.
  amountIn: BigNumber
): BigNumber {
  const inputWithFee = amountIn.mul(997);
  return inputWithFee.mul(outputReserve).div((inputReserve).mul(1000).add(inputWithFee));
}

export async function waitForEach<T, V>(
  array: T[],
  fn: (v: T, i: number) => Promise<V>
): Promise<V[]> {
  const result: V[] = [];
  const next = async (i: number): Promise<V[]> => {
    if (i < array.length) {
      result.push(await fn(array[i], i));
      return next(i + 1);
    }
    return result;
  };
  return next(0);
}
