import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.mjs';

export default function({ db, originator, config }) {
  let process_uuid = uuidv4();
  logger.info(`Process UUID: ${process_uuid}`);

  const register = async function() {
    let registered = false;
    while (!registered) {
      let [ result, _ ] = await Promise.all([
        db.register_process({ originator, process_uuid }),
        new Promise(_ => setTimeout(_, config.pollingDelay))
      ]);
      if (!result) {
        logger.info(`Process lock detected on originator ${originator}; will retry...`);
      } else {
        logger.info(`Process lock acquired for originator ${originator}`);
        registered = true;
      }
    }
  };

  const unregister = function() {
    return db.unregister_process({ originator, process_uuid });
  };

  const get_process_uuid = function() {
    return process_uuid;
  }

  return {
    register,
    unregister,
    get_process_uuid
  };
}