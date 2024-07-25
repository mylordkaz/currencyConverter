package exchangerates

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type Client struct {
	apiKey 		string
	baseURL 	string
}

func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		baseURL: "https://api.exchangerate-api.com/v4/latest/",
	}
}

func (c *Client) GetExchangeRate(from, to string) (float64, error) {
	url := fmt.Sprintf("%s%s", c.baseURL, from)
	resp, err := http.Get(url)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, err
	}

	rates, ok := data["rates"].(map[string]interface{})
	if !ok {
		return 0, fmt.Errorf("Invalid response format")
	}

	rate, ok := rates[to].(float64)
	if !ok {
		return 0, fmt.Errorf("rate not found for %s", to)
	}

	return rate, nil
}