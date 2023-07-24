import { MichelsonMap } from "@taquito/taquito";
import { char2Bytes } from "@taquito/utils";
import { logger } from "../logger.mjs";

export default async function (tezos, { gasLimit, storageLimit }) {
  const loaded_contracts = {};
  const load_contract = async function (contract_address) {
    if (contract_address in loaded_contracts === false) {
      loaded_contracts[contract_address] = await tezos.contract.at(
        contract_address
      );
      logger.info(
        `token contract ${contract_address} loaded ${loaded_contracts[
          contract_address
        ].parameterSchema.ExtractSignatures()}`
      );
    }
    return {
      create_token: loaded_contracts[contract_address].methods.create_token,
      mint_tokens: loaded_contracts[contract_address].methods.mint_tokens,
      transfer_tokens: loaded_contracts[contract_address].methods.transfer,
    };
  };

  const op_to_transfer = async function (op) {
    /*
    let estimate = null;
    try {
      estimate = await tezos.estimate.transfer(op.toTransferParams());
    } catch (err) {
      logger.error(`failed to estimate operation: ${err}`);
    }
    const params = op.toTransferParams({
      gasLimit: Math.max(estimate?.gasLimit ?? 0, gasLimit ?? 0),
      storageLimit: Math.max(estimate?.storageLimit ?? 0, storageLimit ?? 0),
    });
    */
    const params = op.toTransferParams();
    logger.info(`transfer params: ${JSON.stringify(params)}`);
    return params;
  };

  const create_token = async function (
    contract_address,
    token_id,
    metadata_ipfs
  ) {
    const contract_ops = await load_contract(contract_address);
    if (typeof contract_ops.create_token != "function") {
      throw new Error("No create_token entrypoint on contract");
    }
    const token_info = MichelsonMap.fromLiteral({
      "": char2Bytes(metadata_ipfs),
    });
    const create_op = contract_ops.create_token(token_id, token_info);
    return create_op;
  };

  const mint_token = async function (
    contract_address,
    token_id,
    to_address,
    amount = 1
  ) {
    const contract_ops = await load_contract(contract_address);
    if (typeof contract_ops.mint_tokens != "function") {
      throw new Error("No mint_tokens entrypoint on contract");
    }
    const mint_op = contract_ops.mint_tokens([
      { owner: to_address, token_id, amount },
    ]);
    return mint_op;
  };

  return {
    create: async function (
      { contract_address, token_id, metadata_ipfs },
      batch
    ) {
      const create_op = await create_token(
        contract_address,
        token_id,
        metadata_ipfs
      );
      batch.withTransfer(await op_to_transfer(create_op));
      return true;
    },
    mint: async function (
      { contract_address, token_id, to_address, amount },
      batch
    ) {
      const mint_op = await mint_token(
        contract_address,
        token_id,
        to_address,
        amount
      );
      batch.withTransfer(await op_to_transfer(mint_op));
      return true;
    },
    create_and_mint: async function (
      { contract_address, token_id, to_address, metadata_ipfs, amount },
      batch
    ) {
      const create_op = await create_token(
        contract_address,
        token_id,
        metadata_ipfs
      );
      const mint_op = await mint_token(
        contract_address,
        token_id,
        to_address,
        amount
      );
      batch.withTransfer(await op_to_transfer(create_op));
      batch.withTransfer(await op_to_transfer(mint_op));
      return true;
    },
  };
}
