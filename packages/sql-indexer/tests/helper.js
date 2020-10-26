const { Indexer } = require("../lib");
const fs = require("fs");

const knex = require("knex")({
  client: "mysql2",
  connection: {
    host: "127.0.0.1",
    database: "sql_indexer_test",
    user: "travis",
  },
});

const knex2 = require("knex")({
  client: "mysql2",
  connection: {
    host: "127.0.0.1",
    database: "sql_indexer_test2",
    user: "travis",
  },
});

function createBinaryColumn(knex, table, name) {
  const client = knex.client.config.client;
  switch (client) {
    case "postgresql":
      table.binary(name).notNullable();
      break;
    case "mysql2":
      table.specificType(name, "longblob").notNullable();
      break;
    default:
      throw new Error(`Unsupported SQL type: ${client}!`);
  }
}

async function migrateDbUp(knex) {
  await knex.schema
    .createTable("block_digests", function (table) {
      table.bigInteger("block_number").primary().notNullable();

      table.binary("block_hash", 32).notNullable();
      table.unique(["block_hash"]);
    })
    .createTable("transaction_digests", function (table) {
      table.increments("id");

      table.binary("tx_hash", 32).notNullable();
      table.unique(["tx_hash"]);

      table.integer("tx_index").notNullable();
      table.integer("output_count").notNullable();

      table.bigInteger("block_number").notNullable();
      table.foreign("block_number").references("block_digests.block_number");
    })
    .createTable("transaction_inputs", function (table) {
      table.increments("id");

      table.integer("transaction_digest_id").unsigned().notNullable();
      table
        .foreign("transaction_digest_id")
        .references("transaction_digests.id");

      table.binary("previous_tx_hash", 32).notNullable();
      table.bigInteger("previous_index").notNullable();
      table.unique(
        ["previous_tx_hash", "previous_index", "transaction_digest_id"],
        "transaction_inputs_unique_index"
      );
    })
    .createTable("scripts", function (table) {
      table.increments("id");

      table.binary("code_hash", 32).notNullable();
      table.integer("hash_type").notNullable();
      createBinaryColumn(knex, table, "args");

      table.index(["code_hash", "hash_type"]);
    })
    .createTable("transactions_scripts", function (table) {
      table.increments("id");

      table.integer("script_type").notNullable();
      table.integer("io_type").notNullable();
      table.integer("index").notNullable();
      table.integer("transaction_digest_id").unsigned().notNullable();
      table
        .foreign("transaction_digest_id")
        .references("transaction_digests.id");
      table.integer("script_id").unsigned().notNullable();
      table.foreign("script_id").references("scripts.id");
    })
    .createTable("cells", function (table) {
      table.increments("id");
      table.boolean("consumed").notNullable().defaultTo(false);

      table.bigInteger("capacity").notNullable();
      table.binary("tx_hash", 32).notNullable();
      table.integer("index").notNullable();
      table.unique(["tx_hash", "index"]);

      table.bigInteger("block_number").notNullable();
      table.foreign("block_number").references("block_digests.block_number");

      table.integer("tx_index").notNullable();

      table.integer("lock_script_id").unsigned().notNullable();
      table.foreign("lock_script_id").references("scripts.id");
      table.integer("type_script_id").unsigned().nullable();
      table.foreign("type_script_id").references("scripts.id");

      createBinaryColumn(knex, table, "data");
    });
}

async function migrateDbDown(knex) {
  await knex.schema
    .dropTable("cells")
    .dropTable("transactions_scripts")
    .dropTable("scripts")
    .dropTable("transaction_inputs")
    .dropTable("transaction_digests")
    .dropTable("block_digests");
}

Indexer.prototype.initDbFromJsonFile = async function initDbFromJsonFile(
  filePath
) {
  let data = JSON.parse(fs.readFileSync(filePath));
  for (const block of data) {
    await this.append(block);
    await this.publishAppendBlockEvents(block);
  }
};

Indexer.prototype.clearDb = async function clearDb(filePath) {
  let data = JSON.parse(fs.readFileSync(filePath));
  for (const block of data) {
    await this.publishRollbackEvents();
    await this.rollback();
  }
};

module.exports = { knex, knex2, migrateDbUp, migrateDbDown, Indexer };
