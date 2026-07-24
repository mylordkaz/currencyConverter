import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import CurrencySelector from '@/components/CurrencySelector';
import CurrencyList from '@/components/CurrencyList';
import AddCurrencyModal from '@/components/AddCurrencyModal';
import useCurrencies from '@/hooks/useCurrencies';
import { Currency } from '@/constants/type';
import { C, MONO } from '@/constants/theme';

const STORAGE_KEY_CURRENCIES = 'selectedCurrencies';
const STORAGE_KEY_BASE = 'baseCurrency';

export default function Index() {
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(['USD']);
  // Gate persistence until the initial read finishes so we never overwrite
  // stored values with the defaults on mount.
  const [isLoaded, setIsLoaded] = useState(false);

  const { cryptoCurrencies, fiatCurrencies, isLoading, fiatError, cryptoError } =
    useCurrencies();

  // Stable identity so the reorderable list's data doesn't churn on every
  // unrelated re-render (e.g. typing an amount).
  const allCurrencies = useMemo(
    () => [...fiatCurrencies, ...cryptoCurrencies],
    [fiatCurrencies, cryptoCurrencies]
  );

  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        const [savedCurrencies, savedBase] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_CURRENCIES),
          AsyncStorage.getItem(STORAGE_KEY_BASE),
        ]);
        if (savedCurrencies) setSelectedCurrencies(JSON.parse(savedCurrencies));
        if (savedBase) setSelectedCurrency(savedBase);
      } catch (error) {
        console.error('Error loading persisted state', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadPersistedState();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(
      STORAGE_KEY_CURRENCIES,
      JSON.stringify(selectedCurrencies)
    ).catch((error) => console.error('Error saving currencies', error));
  }, [isLoaded, selectedCurrencies]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_BASE, selectedCurrency).catch((error) =>
      console.error('Error saving base currency', error)
    );
  }, [isLoaded, selectedCurrency]);

  const handleCurrencyChange = (currency: string) => setSelectedCurrency(currency);
  const handleAmountChange = (value: string) => setAmount(value);
  const handleAddCurrency = (currency: Currency) => {
    if (!selectedCurrencies.includes(currency.code)) {
      setSelectedCurrencies((prev) => [...prev, currency.code]);
    }
  };
  const handleRemoveCurrency = (currencyCode: string) => {
    setSelectedCurrencies((prev) => prev.filter((code) => code !== currencyCode));
  };
  const handleReorderCurrencies = (newOrder: string[]) => setSelectedCurrencies(newOrder);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }}>
        {/* header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 8, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 36, height: 36, borderRadius: 13, backgroundColor: C.blueDim, borderWidth: 1, borderColor: C.blueLine, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={require('../assets/images/header-mark.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
            </View>
            <View style={{ marginLeft: 11 }}>
              <Text style={{ fontFamily: MONO, fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: 0.5 }}>MONEY SWAP</Text>
              <Text style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: '500', color: C.faint, letterSpacing: 1.8, marginTop: 3 }}>通貨 TERMINAL</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.blue, marginRight: 6 }} />
            <Text style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 1.2, color: C.dim }}>LIVE</Text>
          </View>
        </View>

        {/* meta line */}
        <Text style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.6, color: C.faint, textTransform: 'uppercase', paddingHorizontal: 2, paddingTop: 4, paddingBottom: 16 }}>
          {selectedCurrency} BASE · {selectedCurrencies.length} PAIRS · CC0 FEED
        </Text>

        {/* hero */}
        <CurrencySelector
          currencies={allCurrencies}
          selectedCurrency={selectedCurrency}
          onCurrencyChange={handleCurrencyChange}
          amount={amount}
          onAmountChange={handleAmountChange}
        />

        {/* ledger */}
        <View style={{ flex: 1, marginTop: 20 }}>
          <CurrencyList
            currencies={allCurrencies}
            selectedCurrencyCodes={selectedCurrencies}
            baseCurrency={selectedCurrency}
            baseAmount={parseFloat(amount) || 0}
            isLoading={isLoading}
            fiatError={fiatError}
            cryptoError={cryptoError}
            onRemoveCurrency={handleRemoveCurrency}
            onReorderCurrencies={handleReorderCurrencies}
          />
        </View>
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 32,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 19,
          backgroundColor: C.blue,
          borderWidth: 1,
          borderColor: C.blueBright,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: C.blue,
          shadowOpacity: 0.55,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 }}>+</Text>
      </TouchableOpacity>

      <AddCurrencyModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onAddCurrency={handleAddCurrency}
        availableCurrencies={allCurrencies}
      />
    </SafeAreaView>
  );
}
