import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish, Contract } from "ethers";
import { ethers } from "hardhat";
import { abi as FactoryABI } from "../artifacts/@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Factory.sol/IUniswapV2Factory.json";
import { abi as RouterABI } from "../artifacts/@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Router02.sol/IUniswapV2Router02.json";
import { abi as IERC20ABI } from "../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json";
import { IERC20, IUniswapV2Factory, IUniswapV2Router02 } from "../typechain";

export interface PairInfo {
  symbols: [string, string];
  reserves: [BigNumberish, BigNumberish];
}

export interface ExchangeInfo {
  pairs: PairInfo[];
}

export interface UniswapInfo {
  factory: string;
  router: string;
}

export interface LandscapeInfo {
  exchanges: UniswapInfo[];
  tokens: Record<string, string>; // key symbol, value address
}

export async function initLandscape(signer: SignerWithAddress, tokenSupply: Record<string, BigNumberish>, exchangeInput: ExchangeInfo[]): Promise<LandscapeInfo> {
  const exchanges: UniswapInfo[] = [];
  const tokens: Record<string, string> = {
    WETH: await deployWeth()
  };
  await Promise.all(Object.entries(tokenSupply).map(async ([symbol, supply]) => {
    tokens[symbol] = await deployToken(`${symbol} Token`, symbol, supply);
  }));
  await Promise.all(exchangeInput.map(async ({ pairs }) => {
    const uniswap = await deployUniswap(signer.address, tokens.WETH);
    const { router } = uniswap;
    exchanges.push(uniswap);
    await Promise.all(pairs.map(async ({ reserves, symbols }) => {
      await Promise.all(symbols.map(async (symbol, i) => {
        await approveERC20(signer, tokens[symbol], router, reserves[i]);
      }));
      await addLiquidity(signer, router, symbols.map((symbol) => tokens[symbol]) as [string, string], reserves);
    }));
  }))
  return {
    exchanges,
    tokens
  };
}

export async function approveERC20(signer: SignerWithAddress, token: string, spender: string, amount: BigNumberish) {
  const erc20 = new Contract(token, IERC20ABI, signer) as IERC20;
  const transaction = await erc20.approve(spender, amount);
  await transaction.wait();
  console.log("Approved Spending", {
    transaction: transaction.hash,
    token,
    spender,
    amount
  });
}

export async function tokenBalanceOf(account: string, token: string): Promise<BigNumber> {
  const erc20 = new Contract(token, IERC20ABI, ethers.provider) as IERC20;
  return await erc20.balanceOf(account);
}

export async function getPair(signer: SignerWithAddress, factory: string, tokenA: string, tokenB: string): Promise<string> {
  const factoryContract = new Contract(factory, FactoryABI, signer) as IUniswapV2Factory;
  return await factoryContract.getPair(tokenA, tokenB);
}

export async function addLiquidity(
  signer: SignerWithAddress,
  router: string,
  tokens: [string, string],
  amounts: [BigNumberish, BigNumberish],
  amountMin?: [BigNumberish, BigNumberish]
) {
  const routerContract = new Contract(router, RouterABI, signer) as IUniswapV2Router02;
  const deadline = new Date().getTime();
  const transaction = await routerContract.addLiquidity(
    tokens[0],
    tokens[1],
    amounts[0],
    amounts[1],
    (amountMin || amounts)[0],
    (amountMin || amounts)[1],
    signer.address,
    deadline,
    {
      gasLimit: 10000000
    }
  );
  await transaction.wait();
  console.log("Added Liquidity", {
    hash: transaction.hash,
    tokens,
    amounts,
    to: signer.address
  });
}

export async function deployWeth(): Promise<string> {
  const WETH = await ethers.getContractFactory("WETH9Mock");
  const wethContract = await WETH.deploy();
  await wethContract.deployed();
  console.log(`Deployed WETH: ${wethContract.address}`);
  return wethContract.address;
}

export async function deployToken(name: string, symbol: string, supply: BigNumberish): Promise<string> {
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const tokenContract = await ERC20Mock.deploy(name, symbol, supply);
  await tokenContract.deployed();
  console.log(`Deployed ERC20 ${symbol}: ${tokenContract.address}`);
  return tokenContract.address;
}

export async function deployUniswap(feeToSetter: string, weth: string): Promise<UniswapInfo> {
  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factoryContract = await Factory.deploy(feeToSetter);
  await factoryContract.deployed();
  console.log(`Deployed Factory: ${factoryContract.address}`);
  const Router = await ethers.getContractFactory("UniswapV2Router02");
  const routerContract = await Router.deploy(factoryContract.address, weth);
  await routerContract.deployed();
  console.log(`Deployed Router: ${routerContract.address}`);
  return {
    factory: factoryContract.address,
    router: routerContract.address
  };
}
