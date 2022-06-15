#!/usr/bin/env bash
BASEDIR=$(dirname "$0")
GETH_HOME=$BASEDIR/../go-ethereum
GETH_REPO=https://github.com/ethereum/go-ethereum.git
GETH=$GETH_HOME/build/bin/geth
NETWORK_NAME=devnet
DATA_DIR=$BASEDIR/data
GENESIS=$DATA_DIR/devnet.json

askyn()
{
  while true; do
    read -p "$1 (y/n)? " yn
    case ${yn:0:1} in
        y|Y ) break;;
        n|N ) break;;
        * )
          echo "Please answer yes or no."
        ;;
    esac
  done
}

if [ ! -d $GETH_HOME ]; then
  askyn "clone $GETH_REPO to $GETH_HOME"
  case $yn in
    [Yy]* ) git clone $GETH_REPO $GETH_HOME;;
    [Nn]* ) exit;;
  esac
fi

if [ ! -d $GETH_HOME/build/bin ]; then
  askyn "make geth utilities"
  case $yn in
    [Yy]* ) make -C $GETH_HOME all;;
    [Nn]* ) exit;;
  esac
fi

if [ ! -d $DATA_DIR/keystore ]; then
  askyn "create a new wallet?"
  case $yn in
    [Nn]* ) exit;;
  esac
  echo "************************************************************************************"
  echo "You will first be asked a password, then you need to re-enter the password"
  echo "This will create a keystore data file for your new wallet, you don't really need"
  echo "it to be secure, if you want to use it only for testing purposes."
  echo "************************************************************************************"
  mkdir -p $DATA_DIR
  echo -n "Enter password:"
  read -s  password
  echo ""
  echo -n "$password" > $DATA_DIR/password.txt
  $GETH --datadir $DATA_DIR account new --password $DATA_DIR/password.txt
  echo "Wallet generated, please type the password again..."
  if [[ `$GETH account list --keystore $DATA_DIR/keystore` =~ keystore:\/\/(.*([a-f0-9]{40}))$ ]]; then
    keyfile="${BASH_REMATCH[1]}"
    wallet_address="0x${BASH_REMATCH[2]}"
    echo -n "$wallet_address" > $DATA_DIR/account.txt
    $GETH_HOME/build/bin/ethkey inspect --private $keyfile
    echo "Please see the above output, and copy paste the private key..."
    while true; do
      read -p "What is the private key? " private_key
      if [[ "$private_key" =~ ^[a-f0-9]{64}$ ]]; then
        break
      else
        echo "That's probably not right, please try again"
      fi
    done
  fi
  askyn "output properties to .env file"
  case $yn in
    [Yy]* )
      if [ ! -f $BASEDIR/.env ]; then
        touch $BASEDIR/.env
      fi
      echo "DEVNET_URL=http://localhost:8545" >> $BASEDIR/.env
      echo "DEVNET_KEY=0x$private_key" >> $BASEDIR/.env
      echo "DEVNET_ADDRESS=$wallet_address" >> $BASEDIR/.env
    ;;
    [Nn]* )
      echo "You can update the .env file yourself by copying the following:"
      echo "DEVNET_URL=http://localhost:8545"
      echo "DEVNET_KEY=0x$private_key"
      echo "DEVNET_ADDRESS=$wallet_address"
    ;;
  esac
fi

if [ ! -d $DATA_DIR/devnet ]; then
  if [ ! -f $GENESIS ]; then
    echo "************************************************************************************"
    echo "Generate Genesis Block Instructions..."
    echo "************************************************************************************"
    echo "You will need to do the following:"
    echo "1. If the devnet genesis exists..."
    echo "   ... Manage existing genesis > Remove genesis configuration (2, 3)"
    echo "2. Configure new genesis > Create new genesis from scratch > Clique - proof-of-authority (2, 1, 2)"
    echo "3. Configure it, specify sealer account the new wallet address."
    echo "4. yes for precompiled-addresses pre-funded with 1 wei"
    echo "5. network ID can be anything you like, or nothing for random (you can get it from the json file)"
    echo "6. Manage existing genesis > Export genesis configurations > type \"data\""
    echo "7. exit (ctrl+c or just close terminal)"
    echo "************************************************************************************"
    echo "Use Address = ${wallet_address:2:40}"
    echo "************************************************************************************"
    askyn "create genesis block?"
    case $yn in
      [Nn]* ) exit;;
    esac
    $GETH_HOME/build/bin/puppeth --network devnet
  fi
  echo "************************************************************************************"
  echo "Initializing devnet from genesis now..."
  echo "************************************************************************************"
  if [ -f $GENESIS ]; then
    currentLimit=`node -e "console.log(require('$GENESIS').gasLimit)"`;
    echo "Current limit is $currentLimit"
    if [ "$currentLimit" != "0x1C9C380"  ]; then
      echo "it is recommended to set the genesis gasLimit higher to match mainnet"
      askyn "modify gasLimit to 30,000,000 per block"
      case $yn in
        [Yy]* )
        node -e "const fn='$GENESIS';const v=require(fn);v.gasLimit='0x1C9C380';require('fs').writeFileSync(fn,JSON.stringify(v, null, 2),'utf-8');"
        ;;
      esac
    fi
  else
    echo "genesis file missing: $GENESIS"
    exit 1
  fi
  $GETH --datadir $DATA_DIR/devnet init $GENESIS
fi

wallet_address=`cat $DATA_DIR/account.txt`
if [ -f $GENESIS ]; then
  networkid=`node -e "console.log(require('$GENESIS').config.chainId)"`
else
  echo "genesis file missing: $GENESIS"
  exit 1
fi

echo "************************************************************************************"
echo "Devnet Settings:"
echo "networkid=$networkid"
echo "wallet_address=$networkid"
echo "************************************************************************************"

$GETH \
  --datadir $DATA_DIR/devnet \
  --keystore $DATA_DIR/keystore \
  --syncmode 'full' \
  --port 30311 \
  --allow-insecure-unlock \
  --ws \
  --ws.addr 'localhost' \
  --ws.port 8546 \
  --ws.api 'personal,eth,net,web3,txpool,miner' \
  --http \
  --http.addr '0.0.0.0' \
  --http.port 8545 \
  --http.api 'personal,eth,net,web3,txpool,miner' \
  --networkid 34354 \
  --miner.gasprice '10000000' \
  --unlock ''$wallet_address'' \
  --password $DATA_DIR/password.txt \
  --mine