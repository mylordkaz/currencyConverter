import { View, Text, ScrollView, ActivityIndicator, Image } from 'react-native';
import tw from 'twrnc';
import { Currency } from '@/constants/type';

interface CurrencyListProps {
  currencies: Currency[];
  selectedCurrencyCodes: string[];
  baseCurrency: string;
  baseAmount: number;
  isLoading: boolean;
  error: string | null;
  onAddCurrency: (currency: Currency) => void;
  onRemoveCurrency: (currencyCode: string) => void;
  availableCurrencies: Currency[];
}

const CurrencyList: React.FC<CurrencyListProps> = ({
  currencies,
  selectedCurrencyCodes,
  baseCurrency,
  baseAmount,
  isLoading,
  error,
}) => {
  const getDescriptionRate = (
    currency: Currency,
    baseCurrencyObj: Currency
  ) => {
    if (baseCurrencyObj.type === 'fiat') {
      if (currency.type === 'fiat') {
        return currency.rate / baseCurrencyObj.rate;
      } else {
        return 1 / (currency.rate * baseCurrencyObj.rate);
      }
    } else {
      if (currency.type === 'fiat') {
        return baseCurrencyObj.rate * currency.rate;
      } else {
        return baseCurrencyObj.rate / currency.rate;
      }
    }
  };

  const getDescription = (currency: Currency, baseCurrencyObj: Currency) => {
    if (baseCurrencyObj.code === currency.code)
      return `1 ${currency.code} = 1 ${baseCurrencyObj.code}`;

    const descriptionRate = getDescriptionRate(currency, baseCurrencyObj);

    return `1 ${baseCurrencyObj.code} = ${descriptionRate.toFixed(4)} ${
      currency.code
    }`;
  };

  const convertCurrency = (
    amount: number,
    from: Currency,
    to: Currency
  ): number | null => {
    if (isNaN(amount) || !isFinite(amount)) {
      console.error('Invalid amount for conversion');
      return null;
    }

    if (!from || !to) {
      console.error('Invalid currency for conversion');
      return null;
    }

    if (from.code === to.code) {
      return amount;
    }

    try {
      let convertedAmount: number;

      if (from.type === 'crypto' && to.type === 'fiat') {
        const amountInUsd = amount * from.rate;
        convertedAmount = amountInUsd * to.rate;
      } else if (from.type === 'fiat' && to.type === 'crypto') {
        const amountInUsd = amount / from.rate;
        convertedAmount = amountInUsd / to.rate;
      } else if (from.type === 'crypto' && to.type === 'crypto') {
        const amountInUsd = amount * from.rate;
        convertedAmount = amountInUsd / to.rate;
      } else {
        const amountInUsd = amount / from.rate;
        convertedAmount = amountInUsd * to.rate;
      }

      return Number(convertedAmount.toFixed(6));
    } catch (error) {
      console.error('Error during currency conversion:', error);
      return null;
    }
  };

  if (isLoading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (error) {
    return <Text style={tw`text-red-500`}>{error}</Text>;
  }

  const baseCurrencyData = currencies.find((c) => c.code === baseCurrency);
  const selectedCurrencies = currencies.filter((c) =>
    selectedCurrencyCodes.includes(c.code)
  );

  if (!baseCurrencyData) {
    return <Text style={tw`text-red-500`}>Base currency not found</Text>;
  }

  return (
    <View style={tw`bg-white rounded-3xl p-6 flex-1`}>
      <Text style={tw`text-2xl font-bold mb-4`}>My currencies</Text>
      <ScrollView style={tw`flex-1`}>
        {selectedCurrencies.map((currency) => {
          const convertedAmount = convertCurrency(
            baseAmount,
            baseCurrencyData,
            currency
          );
          return (
            <View
              key={currency.code}
              style={tw`flex-row items-center justify-between py-3 border-b border-gray-100`}
            >
              <View style={tw`flex-row items-center`}>
                {currency.type === 'crypto' ? (
                  <Image
                    source={{ uri: currency.flag }}
                    style={tw`w-6 h-6 mr-2`}
                  />
                ) : (
                  <Text style={tw`mr-2 text-lg`}>{currency.flag}</Text>
                )}
                <Text style={tw`font-semibold`}>{currency.code}</Text>
              </View>
              <View style={tw`items-end`}>
                <Text style={tw`font-semibold`}>
                  {currency.symbol}
                  {convertedAmount !== null
                    ? convertedAmount.toFixed(2)
                    : '0.00'}
                </Text>
                <Text style={tw`text-xs text-gray-500`}>
                  {getDescription(currency, baseCurrencyData)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      {/* <TouchableOpacity
        style={tw`absolute bottom-4 right-4 bg-black rounded-full w-12 h-12 items-center justify-center z-10`}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={tw`text-white font-bold text-2xl`}>+</Text>
      </TouchableOpacity>
      <AddCurrencyModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onAddCurrency={onAddCurrency}
        availableCurrencies={availableCurrencies}
      /> */}
    </View>
  );
};

export default CurrencyList;
