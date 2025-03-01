import { logger } from "@c15t/new";
import chalk from "chalk";
import { Command } from "commander";
import Crypto from "node:crypto";

export const generateSecret = new Command("secret").action(() => {
	const secret = Crypto.randomBytes(32).toString("hex");
	logger.info(`\nAdd the following to your .env file: 
${
	chalk.gray("# Auth Secret") + chalk.green(`\nBETTER_AUTH_SECRET=${secret}`)
}`);
});
