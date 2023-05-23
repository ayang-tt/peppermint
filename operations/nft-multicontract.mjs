//import { TezosToolkit } from "@taquito/taquito";
import { MichelsonMap, TezosPreapplyFailureError } from '@taquito/taquito'
import { char2Bytes } from '@taquito/utils'
import { logger } from '../logger.mjs';
// import { createRequire } from 'module'
// const require = createRequire(import.meta.url);

// const hex = require('string-hex');
// const utf8 = require('utf8')

export default async function(tezos, { gasLimit, storageLimit }) {
	let loaded_contracts = {};
	let load_contract = async function(contract_address) {
		if (contract_address in loaded_contracts === false) {
			loaded_contracts[contract_address] = await tezos.contract.at(contract_address);
			logger.info(`token contract ${contract_address} loaded ${loaded_contracts[contract_address].parameterSchema.ExtractSignatures()}`);
		}
		return {
			create_token: loaded_contracts[contract_address].methods.create_token,
			mint_tokens: loaded_contracts[contract_address].methods.mint_tokens,
			transfer_tokens: loaded_contracts[contract_address].methods.transfer
		}
	}

	let op_to_transfer = async function(op) {
		let estimate = await tezos.estimate.transfer(op.toTransferParams());
		let params = op.toTransferParams({
			gasLimit: Math.max(estimate.gasLimit ?? 0, gasLimit ?? 0),
			storageLimit: Math.max(estimate.storageLimit ?? 0, storageLimit ?? 0),
		});
		return params
	}

	let create_token = async function(contract_address, token_id, metadata_ipfs) {
		let contract_ops = await load_contract(contract_address);
		if (typeof contract_ops.create_token != 'function') {
			throw new Error("No create_token entrypoint on contract");
		}
		let token_info = MichelsonMap.fromLiteral({"": char2Bytes(metadata_ipfs)});
		let create_op = contract_ops.create_token(token_id, token_info);
		return create_op;
	};

	let mint_token = async function(contract_address, token_id, to_address, amount = 1) {
		let contract_ops = await load_contract(contract_address);
		if (typeof contract_ops.mint_tokens != 'function') {
			throw new Error("No mint_tokens entrypoint on contract");
		}
		let mint_op = contract_ops.mint_tokens([{ owner: to_address, token_id, amount }]);
		return mint_op;
	};

	return {
		create: async function({ contract_address, token_id, metadata_ipfs }, batch) {
			let create_op = await create_token(contract_address, token_id, metadata_ipfs);
			batch.withTransfer(await op_to_transfer(create_op));
			return true;
		},
		mint: async function({ contract_address, token_id, to_address, amount }, batch) {
			let mint_op = await mint_token(contract_address, token_id, to_address, amount);
			batch.withTransfer(await op_to_transfer(mint_op));
			return true;
		},
		create_and_mint: async function({ contract_address, token_id, to_address, metadata_ipfs, amount }, batch) {
			let create_op = await create_token(contract_address, token_id, metadata_ipfs);
			let mint_op = await mint_token(contract_address, token_id, to_address, amount);
			batch.withTransfer(await op_to_transfer(create_op));
			batch.withTransfer(await op_to_transfer(mint_op));
			return true;
		},
	};
}
