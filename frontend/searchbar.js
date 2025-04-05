const { AzureOpenAI } = require("openai");
const { DefaultAzureCredential } = require("@azure/identity");
const dotenv = require("dotenv");

dotenv.config();

async function main() {
  // You will need to set these environment variables or edit the following values
  const endpoint =
    process.env["AZURE_OPENAI_ENDPOINT"] ||
    "https://sql-searcher.openai.azure.com/";
  const apiVersion = "2024-12-01-preview";
  const deployment = "o3-mini"; // This must match your deployment name

  // Initialize the DefaultAzureCredential
  const credential = new DefaultAzureCredential();

  // Initialize the AzureOpenAI client with Entra ID (Azure AD) authentication
  const client = new AzureOpenAI({
    endpoint,
    credential,
    apiVersion,
    deployment,
  });

  const result = await client.chat.completions.create({
    messages: [
      {
        role: "developer",
        content:
          'You are an SQL query generator and you generate SQL queries for an event database. The schema of the database is as such where every entry has the following attributes: id, source(is either "amny", "hobokengirl", "visitnj", "duclink", where ducklink are events specifically at Stevens Institute of Technology), title, description, date, location, image(link to image), URL(link to event listing), price, popularity(score out of 100 on how popular the event is to students attending Stevens Institute of Technology), attendance(expected attendance). Only respond with an SQL query or respond with the string "ERROR" if there is any issue. Always begin with "SELECT * FROM c" and format every attribute as "c.{attribute}". Remove the semicolons at the end and make sure any strings ignore capitailzation.',
      },
    ],
    max_completion_tokens: 100000,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("The sample encountered an error:", err);
});

module.exports = { main };
