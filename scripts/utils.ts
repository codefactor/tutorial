import { BigNumber, BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { sqrt, JSBI } from "@sushiswap/sdk";

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

export function getPathOutput(
  reserves: [BigNumber, BigNumber][],
  amountIn: BigNumber
): BigNumber {
  let output = amountIn;
  reserves.forEach((reserve) => {
    output = getOutputAmount(reserve, output);
  });
  return output;
}

const _0 = BigNumber.from(0);
const _1 = BigNumber.from(1);
const N = BigNumber.from(997);
const D = BigNumber.from(1000);
const sqrtBN = (value: BigNumber): BigNumber => 
  BigNumber.from(sqrt(JSBI.BigInt(value.toString())).toString());

export function getOptimalInput(
  reserves: [BigNumber, BigNumber][]
): BigNumber {
  let A = _1;
  let B = _0;
  let C = _1;
  const n = reserves.length;
  const NB = reserves.map(([,b]) => N.mul(b));
  const DA = reserves.map(([a]) => D.mul(a));

  for (let x = 0; x < n; x++) {
    let term = N;
    for (let y = x + 1; y < n; y++) {
      term = term.mul(DA[y]);
    }
    for (let y = 0; y < x; y++) {
      term = term.mul(NB[y]);
    }
    A = A.mul(NB[x]);
    B = B.add(term);
    C = C.mul(DA[x]);
  }

  const sqrtAC = sqrtBN(A.mul(C));
  if (B.lte(0) || sqrtAC.lte(C)) {
    return _0;
  }

  return sqrtAC.sub(C).div(B);
}

export function getProfit(
  reserves: [BigNumber, BigNumber][],
  amountIn: BigNumber
): BigNumber {
  return getPathOutput(reserves, amountIn).sub(amountIn);
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
