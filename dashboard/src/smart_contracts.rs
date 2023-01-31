use reqwest;

pub async fn fetch_hedge_fund_data() -> Result<String, reqwest::Error> {
    let resp = reqwest::get("https://api.example.com/hedge-fund-data").await?;
    let data = resp.text().await?;
    Ok(data)
}

pub fn parse_hedge_fund_data(data: String) -> Vec<HedgeFund> {
    todo!("Parse data from API response")
    todo!("Return Vec<HedgeFund>"
}