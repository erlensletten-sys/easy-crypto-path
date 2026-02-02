import fetch from 'node-fetch';

/**
 * Blockchain Verification Service
 * Verifies cryptocurrency transactions using public blockchain APIs
 */

// Minimum confirmations required for each crypto
const MIN_CONFIRMATIONS = {
  btc: 3,
  eth: 12,
  usdt: 12, // ERC-20 token on Ethereum
  usdc: 12, // ERC-20 token on Ethereum
  bnb: 15,
  ltc: 6,  // Kept for backward compatibility but not primary
  default: 6
};

/**
 * Verify Bitcoin transaction
 * Uses blockchain.info API (no API key required)
 */
async function verifyBitcoinTransaction(txHash) {
  try {
    const response = await fetch(`https://blockchain.info/rawtx/${txHash}`);

    if (!response.ok) {
      if (response.status === 404) {
        return { found: false, error: 'Transaction not found' };
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Get block height to calculate confirmations
    let confirmations = 0;
    if (data.block_height) {
      const chainInfoResponse = await fetch('https://blockchain.info/q/getblockcount');
      const currentHeight = parseInt(await chainInfoResponse.text());
      confirmations = currentHeight - data.block_height + 1;
    }

    // Calculate total output amount in BTC (satoshis to BTC)
    const totalOutput = data.out.reduce((sum, output) => sum + output.value, 0) / 100000000;

    return {
      found: true,
      txHash: data.hash,
      confirmations,
      amount: totalOutput,
      timestamp: data.time,
      blockHeight: data.block_height,
      status: confirmations >= MIN_CONFIRMATIONS.btc ? 'verified' : 'pending'
    };
  } catch (error) {
    console.error('Bitcoin verification error:', error);
    return { found: false, error: error.message };
  }
}

/**
 * Verify Ethereum transaction
 * Uses Etherscan API (public, rate limited)
 */
async function verifyEthereumTransaction(txHash) {
  try {
    // Using Etherscan's public API (rate limited but no key needed for basic queries)
    const response = await fetch(
      `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=YourApiKeyToken`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.result || data.result === null) {
      return { found: false, error: 'Transaction not found' };
    }

    const tx = data.result;

    // Get transaction receipt for confirmation status
    const receiptResponse = await fetch(
      `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=YourApiKeyToken`
    );
    const receiptData = await receiptResponse.json();

    // Get current block number
    const blockResponse = await fetch(
      `https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=YourApiKeyToken`
    );
    const blockData = await blockResponse.json();
    const currentBlock = parseInt(blockData.result, 16);

    const txBlockNumber = parseInt(tx.blockNumber, 16);
    const confirmations = txBlockNumber > 0 ? currentBlock - txBlockNumber + 1 : 0;

    // Convert wei to ETH
    const amountInEth = parseInt(tx.value, 16) / 1e18;

    return {
      found: true,
      txHash: tx.hash,
      confirmations,
      amount: amountInEth,
      from: tx.from,
      to: tx.to,
      blockNumber: txBlockNumber,
      status: receiptData.result?.status === '0x1'
        ? (confirmations >= MIN_CONFIRMATIONS.eth ? 'verified' : 'pending')
        : 'failed'
    };
  } catch (error) {
    console.error('Ethereum verification error:', error);
    return { found: false, error: error.message };
  }
}

/**
 * Verify Litecoin transaction
 * Uses BlockCypher API (no API key required for low volume)
 */
async function verifyLitecoinTransaction(txHash) {
  try {
    const response = await fetch(`https://api.blockcypher.com/v1/ltc/main/txs/${txHash}`);

    if (!response.ok) {
      if (response.status === 404) {
        return { found: false, error: 'Transaction not found' };
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    const confirmations = data.confirmations || 0;
    const totalOutput = data.outputs.reduce((sum, output) => sum + output.value, 0) / 100000000;

    return {
      found: true,
      txHash: data.hash,
      confirmations,
      amount: totalOutput,
      blockHeight: data.block_height,
      timestamp: data.received,
      status: confirmations >= MIN_CONFIRMATIONS.ltc ? 'verified' : 'pending'
    };
  } catch (error) {
    console.error('Litecoin verification error:', error);
    return { found: false, error: error.message };
  }
}

/**
 * Verify ERC-20 token transaction (USDT, USDC on Ethereum)
 * Uses Etherscan API
 */
async function verifyERC20Transaction(txHash, tokenSymbol) {
  try {
    // First verify the transaction exists
    const ethResult = await verifyEthereumTransaction(txHash);

    if (!ethResult.found) {
      return ethResult;
    }

    // For ERC-20 tokens, we need to check the transaction logs
    const response = await fetch(
      `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=YourApiKeyToken`
    );

    const data = await response.json();

    if (!data.result || !data.result.logs || data.result.logs.length === 0) {
      return { found: false, error: 'Token transfer not found in transaction' };
    }

    // The first log usually contains the Transfer event
    // For a proper implementation, we should decode the log data
    // For now, we'll return the ETH transaction data with a note

    return {
      ...ethResult,
      tokenType: 'ERC-20',
      tokenSymbol: tokenSymbol.toUpperCase(),
      note: 'Token amount should be verified manually from transaction logs'
    };
  } catch (error) {
    console.error('ERC-20 verification error:', error);
    return { found: false, error: error.message };
  }
}

/**
 * Main verification function - routes to appropriate blockchain
 */
export async function verifyTransaction(txHash, cryptoId) {
  const crypto = cryptoId.toLowerCase();

  console.log(`🔍 Verifying ${crypto.toUpperCase()} transaction: ${txHash}`);

  try {
    let result;

    switch (crypto) {
      case 'btc':
        result = await verifyBitcoinTransaction(txHash);
        break;

      case 'eth':
        result = await verifyEthereumTransaction(txHash);
        break;

      case 'usdt':
      case 'usdc':
        result = await verifyERC20Transaction(txHash, crypto);
        break;

      case 'ltc':
        result = await verifyLitecoinTransaction(txHash);
        break;

      case 'bnb':
        // BNB on BSC - would need BSCScan API
        result = {
          found: false,
          error: 'BNB verification not yet implemented. Please verify manually.'
        };
        break;

      default:
        result = {
          found: false,
          error: `Verification for ${crypto.toUpperCase()} not yet implemented`
        };
    }

    console.log(`✅ Verification result:`, result);
    return result;

  } catch (error) {
    console.error('Verification error:', error);
    return {
      found: false,
      error: `Verification failed: ${error.message}`
    };
  }
}

/**
 * Get minimum confirmations required for a cryptocurrency
 */
export function getMinConfirmations(cryptoId) {
  const crypto = cryptoId.toLowerCase();
  return MIN_CONFIRMATIONS[crypto] || MIN_CONFIRMATIONS.default;
}

/**
 * Check if transaction has enough confirmations
 */
export function hasEnoughConfirmations(confirmations, cryptoId) {
  return confirmations >= getMinConfirmations(cryptoId);
}
