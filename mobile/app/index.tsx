import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import tw from "twrnc";
import CurrencySelector from "@/components/CurrencySelector";
import CurrencyList from "@/components/CurrencyList";
import useCurrencies from "@/hooks/useCurrencies";
import { useEffect, useState } from "react";
import AddCurrencyModal from "@/components/AddCurrencyModal";
import { Currency } from "@/constants/type";

const STORAGE_KEY_CURRENCIES = "selectedCurrencies";
const STORAGE_KEY_BASE = "baseCurrency";

export default function Index() {
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([
    "USD",
  ]);
  // Gate persistence until the initial read finishes so we never overwrite
  // stored values with the defaults on mount.
  const [isLoaded, setIsLoaded] = useState(false);

  const { cryptoCurrencies, fiatCurrencies, isLoading, fiatError, cryptoError } =
    useCurrencies();

  const allCurrencies = [...fiatCurrencies, ...cryptoCurrencies];

  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        const [savedCurrencies, savedBase] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_CURRENCIES),
          AsyncStorage.getItem(STORAGE_KEY_BASE),
        ]);
        if (savedCurrencies) {
          setSelectedCurrencies(JSON.parse(savedCurrencies));
        }
        if (savedBase) {
          setSelectedCurrency(savedBase);
        }
      } catch (error) {
        console.error("Error loading persisted state", error);
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
      JSON.stringify(selectedCurrencies),
    ).catch((error) => console.error("Error saving currencies", error));
  }, [isLoaded, selectedCurrencies]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_BASE, selectedCurrency).catch((error) =>
      console.error("Error saving base currency", error),
    );
  }, [isLoaded, selectedCurrency]);

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const handleAddCurrency = (currency: Currency) => {
    if (!selectedCurrencies.includes(currency.code)) {
      setSelectedCurrencies((prevSelected) => [...prevSelected, currency.code]);
    }
  };

  const handleRemoveCurrency = (currencyCode: string) => {
    setSelectedCurrencies((prevSelected) =>
      prevSelected.filter((code) => code !== currencyCode),
    );
  };

  const handleReorderCurrencies = (newOrder: string[]) => {
    setSelectedCurrencies(newOrder);
  };

  return (
    <LinearGradient colors={["#60A5FA", "#2563EB"]} style={tw`flex-1`}>
      <SafeAreaView style={tw`flex-1`}>
        <View style={tw`flex-1 p-4`}>
          <View style={tw`mb-4 items-center justify-center`}>
            <View>
              <Text
                style={[
                  tw`text-4xl font-bold text-white tracking-wide mr-20`,
                  { fontFamily: "Delius" },
                ]}
              >
                Money
              </Text>
              <Text
                style={[
                  tw`text-4xl font-bold text-white tracking-wide ml-24`,
                  { fontFamily: "Delius" },
                ]}
              >
                Swap
              </Text>
            </View>
          </View>
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
              fiatError={fiatError}
              cryptoError={cryptoError}
              onRemoveCurrency={handleRemoveCurrency}
              onReorderCurrencies={handleReorderCurrencies}
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
