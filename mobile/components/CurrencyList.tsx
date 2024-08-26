import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import tw from 'twrnc';

const currencyData = [
  { code: 'JPY', flag: '🇯🇵', rate: '144.2385', type: 'fiat' },
  { code: 'EUR', flag: '🇪🇺', rate: '0.8943', type: 'fiat' },
  { code: 'USD', flag: '🇺🇸', rate: '1', type: 'fiat' },
  {
    code: 'ETH',
    flagUrl: 'https://example.com/eth.png',
    rate: '0.0004',
    type: 'crypto',
  },
  {
    code: 'BTC',
    flagUrl: 'https://example.com/btc.png',
    rate: '0.0000',
    type: 'crypto',
  },
  {
    code: 'XRP',
    flagUrl: 'https://example.com/xrp.png',
    rate: '1.6782',
    type: 'crypto',
  },
  {
    code: 'USDT',
    flagUrl: 'https://example.com/usdt.png',
    rate: '0.9997',
    type: 'crypto',
  },
  {
    code: 'SOL',
    flagUrl: 'https://example.com/sol.png',
    rate: '0.0063',
    type: 'crypto',
  },
];

const CurrencyList = () => {
  return (
    <View style={tw`bg-white rounded-3xl p-6 mt-6`}>
      <Text style={tw`text-2xl font-bold mb-4`}>My Currencies</Text>
      <ScrollView>
        {currencyData.map((currency) => (
          <View
            key={currency.code}
            style={tw`flex-row items-center justify-between py-3 border-b border-gray-100`}
          >
            <View style={tw`flex-row items-center`}>
              {currency.type === 'crypto' ? (
                <Image
                  source={{ uri: currency.flagUrl }}
                  style={tw`w-6 h-6 mr-2`}
                />
              ) : (
                <Text style={tw`mr-2 text-lg`}>{currency.flag}</Text>
              )}
              <Text style={tw`font-semibold`}>{currency.code}</Text>
            </View>
            <View style={tw`items-end`}>
              <Text style={tw`font-semibold`}>0.00</Text>
              <Text style={tw`text-xs text-gray-500`}>
                1 USD = {currency.rate} {currency.code}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity
        style={tw`absolute bottom-4 right-4 bg-black rounded-full w-12 h-12 items-center justify-center`}
        onPress={() => {
          /* Handle add currency */
        }}
      >
        <Text style={tw`text-white text-2xl`}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CurrencyList;
