import { createRequire } from 'module'
import { logger } from './logger.mjs';
const require = createRequire(import.meta.url);

const CONFIG_PATH = '.'

export default function() {
  let config_json = process.env.PEPPERMINT_CONFIG;
  if(config_json) {
    logger.info(config_json);
    return JSON.parse(config_json);
  }
  let profile = process.env.PEPPERMINT_PROFILE;
  let config_filename = profile ? `config_${profile}.json` : 'config.json';
  logger.info(`Reading configuration from ${config_filename}...`);
  return require(`${CONFIG_PATH}/${config_filename}`);
}
