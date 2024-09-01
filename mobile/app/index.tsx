import { SafeAreaView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import CurrencySelector from '@/components/CurrencySelector';
import CurrencyList from '@/components/CurrencyList';
import useCurrencies from '@/hooks/useCurrencies';
import { Suspense, useState } from 'react';
import { Currency } from '@/constants/type';

export default function Index() {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([
    'USD',
  ]);
  const { cryptoCurrencies, fiatCurrencies, isLoading, error } =
    useCurrencies();

  const allCurrencies = [...fiatCurrencies, ...cryptoCurrencies];

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };
  const handleAddCurrency = (currency: { code: string }) => {
    if (!selectedCurrencies.includes(currency.code)) {
      setSelectedCurrencies([...selectedCurrencies, currency.code]);
    }
  };

  return (
    <Suspense fallback={<Text>Loading</Text>}>
      <LinearGradient
        colors={['#60A5FA', '#2563EB']} // Light blue to darker blue
        style={tw`flex-1`}
      >
        <SafeAreaView style={tw`flex-1`}>
          <View style={tw`flex-1 p-4`}>
            <Text style={tw`text-4xl font-bold mb-8 text-center text-black`}>
              Tsukakan
            </Text>
            <CurrencySelector
              currencies={allCurrencies}
              selectedCurrency={selectedCurrency}
              onCurrencyChange={handleCurrencyChange}
              amount={amount}
              onAmountChange={handleAmountChange}
            />
            <CurrencyList
              currencies={allCurrencies}
              baseCurrency={selectedCurrency}
              baseAmount={parseFloat(amount) || 0}
              isLoading={isLoading}
              error={error}
              onAddCurrency={handleAddCurrency}
              availableCurrencies={allCurrencies}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Suspense>
  );
}
