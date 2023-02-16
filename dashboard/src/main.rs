extern crate ethereum_types;
extern crate web3;

use ethereum_types::Address;
use web3::contract::{Contract, Options};
use web3::futures::Future;
use web3::types::U256;


#[tokio::main]
async fn main() -> web3::Result<()> {
    // Connect to the Ethereum blockchain
    let (_eloop, transport) = web3::transports::Http::new("http://localhost:8545").unwrap();
    let web3 = web3::Web3::new(transport);

    println!("Calling accounts.");
    let mut accounts = web3.eth().accounts().await?;
    println!("Accounts: {:?}", accounts);
    accounts.push("00a329c0648769a73afac7f9381e08fb43dbea72".parse().unwrap());

    println!("Calling balance.");
    for account in accounts {
        let balance = web3.eth().balance(account, None).await?;
        println!("Balance of {:?}: {}", account, balance);
    }

    // Deploy the smart contract
    let contract_address = deploy_contract(web3.clone()).wait().unwrap();

    // Create a new instance of the smart contract
    let contract = Contract::from_json(
        web3.eth(),
        contract_address,
        include_bytes!("smart_contracts.json"),
    ).unwrap();

    // Call the smart contract's "get" function
    let result = contract
        .call("get", (), contract_address, Options::default(), None)
        .wait()
        .unwrap();

    // Print the result
    println!("Result: {:?}", result);

    Ok(())
}

fn deploy_contract(web3: web3::Web3<web3::transports::Http>) -> Result<Address, Box<dyn std::error::Error + Send + Sync>> {
    // Define the contract bytecode
    let bytecode = "0x60606060606060606060606060606060606060606060606060606060606060606";

    // Deploy the smart contract
    web3.eth().contract().deploy(bytecode)
        .send()
        .map_err(|_| std::error::Error::new(std::io::ErrorKind::Other, "Deployment failed"))
        .and_then(|transaction| {
            // Wait for the transaction to be mined
            transaction
                .wait()
                .map(|receipt| receipt.contract_address.unwrap())
                .map_err(|_| std::error::Error::new(std::io::ErrorKind::Other, "Transaction failed"))
        })
}