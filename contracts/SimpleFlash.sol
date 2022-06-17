// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import "@sushiswap/core/contracts/Ownable.sol";
import "@sushiswap/core/contracts/interfaces/IERC20.sol";
import "@sushiswap/core/contracts/libraries/SafeERC20.sol";
import "@sushiswap/core/contracts/libraries/SafeMath.sol";
import "@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Pair.sol";
import "hardhat/console.sol";

contract SimpleFlash is Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    function uniswapV2Call(
        address /* _sender */,
        uint256 _amountOut0,
        uint256 _amountOut1,
        bytes calldata _data
    ) external {
        (
            address nextPair,
            address inputToken,
            address outputToken,
            uint256 inputAmount
        ) = abi.decode(_data, (address, address, address, uint256));
        bool is0 = _amountOut0 != 0;
        uint256 firstAmountOut = is0 ? _amountOut0 : _amountOut1;
        uint256 nextAmountOut = _getAmountOut(nextPair, firstAmountOut, is0);

        console.log("_amountOut0=%s", _amountOut0);
        console.log("_amountOut1=%s", _amountOut1);
        console.log("nextPair=%s", nextPair);
        console.log("inputToken=%s", inputToken);
        console.log("outputToken=%s", outputToken);
        console.log("inputAmount=%s", inputAmount);
        console.log("firstAmountOut=%s", firstAmountOut);
        console.log("nextAmountOut=%s", nextAmountOut);

        // Transfer the first amountOut to the nextPair
        IERC20(outputToken).safeTransfer(nextPair, firstAmountOut);
        // Swap on the next pair, using the nextAmountOut
        IUniswapV2Pair(nextPair).swap(is0 ? 0 : nextAmountOut, is0 ? nextAmountOut : 0, address(this), new bytes(0));
        // Transfer the input amount back to the first pair
        IERC20(inputToken).safeTransfer(msg.sender, inputAmount);
        // Transfer the profits to the owner
        IERC20(inputToken).safeTransfer(owner, nextAmountOut - inputAmount);
    }

    function _getAmountOut(address _pair, uint256 _amountIn, bool _is0) internal view returns (uint256) {
        (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Pair(_pair).getReserves();
        uint256 inputWithFee = _amountIn.mul(997);
        return inputWithFee.mul(_is0 ? reserve1 : reserve0) / (_is0 ? reserve0 : reserve1).mul(1000).add(inputWithFee);
    }
}