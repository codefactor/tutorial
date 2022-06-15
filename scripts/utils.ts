import { BigNumber, BigNumberish } from "ethers";
import { ethers } from "hardhat";

export function units(value: BigNumberish): BigNumber {
  return ethers.utils.parseUnits(value.toString(), 18);
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
