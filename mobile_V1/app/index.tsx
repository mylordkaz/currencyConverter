import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import CurrencySelector from '@/components/CurrencySelector';
import CurrencyList from '@/components/CurrencyList';
import useCurrencies from '@/hooks/useCurrencies';
import { useEffect, useState } from 'react';
import AddCurrencyModal from '@/components/AddCurrencyModal';

export default function Index() {
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([
    'USD',
  ]);
  const { cryptoCurrencies, fiatCurrencies, isLoading, error } =
    useCurrencies();

  const allCurrencies = [...fiatCurrencies, ...cryptoCurrencies];

  useEffect(() => {
    loadSelectedCurrencies();
  }, []);

  useEffect(() => {
    saveSelectedCurrencies();
  }, [selectedCurrencies]);

  const loadSelectedCurrencies = async () => {
    try {
      const savedCurrencies = await AsyncStorage.getItem('selectedCurrencies');
      if (savedCurrencies) {
        setSelectedCurrencies(JSON.parse(savedCurrencies));
      }
    } catch (error) {
      console.error('Error loading currencies', error);
    }
  };

  const saveSelectedCurrencies = async () => {
    try {
      await AsyncStorage.setItem(
        'selectedCurrencies',
        JSON.stringify(selectedCurrencies)
      );
    } catch (error) {
      console.error('Error saving currencies', error);
    }
  };

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
  const handleRemoveCurrency = (currencyCode: string) => {
    setSelectedCurrencies(
      selectedCurrencies.filter((code) => code !== currencyCode)
    );
  };

  return (
    <LinearGradient colors={['#60A5FA', '#2563EB']} style={tw`flex-1`}>
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
          <View style={tw`flex-1 mt-4`}>
            <CurrencyList
              currencies={allCurrencies}
              selectedCurrencyCodes={selectedCurrencies}
              baseCurrency={selectedCurrency}
              baseAmount={parseFloat(amount) || 0}
              isLoading={isLoading}
              error={error}
              onRemoveCurrency={handleRemoveCurrency}
              availableCurrencies={allCurrencies}
            />
          </View>
        </View>

        <TouchableOpacity
          style={tw`absolute bottom-8 right-8 bg-black rounded-full w-16 h-16 items-center justify-center z-10`}
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={tw`text-white font-bold text-3xl`}>+</Text>
        </TouchableOpacity>
        <AddCurrencyModal
          isVisible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          onAddCurrency={handleAddCurrency}
          availableCurrencies={allCurrencies}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}
