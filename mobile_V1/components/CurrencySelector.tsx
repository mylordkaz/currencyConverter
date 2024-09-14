import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Dimensions,
} from 'react-native';
import tw from 'twrnc';
import { Currency } from '@/constants/type';

interface CurrencySelectorProps {
  currencies: Currency[];
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
}

const { width, height } = Dimensions.get('window');

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  currencies,
  selectedCurrency,
  onCurrencyChange,
  amount,
  onAmountChange,
}) => {
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCurrencies, setFilteredCurrencies] = useState(currencies);

  const selectedCurrencyData = currencies.find(
    (c) => c.code === selectedCurrency
  );

  useEffect(() => {
    const filtered = currencies.filter(
      (currency) =>
        currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        currency.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCurrencies(filtered);
  }, [searchQuery, currencies]);

  const closeModal = useCallback(() => {
    setIsDropdownVisible(false);
    setSearchQuery('');
  }, []);

  const renderCurrencyItem = ({ item }: { item: Currency }) => (
    <TouchableOpacity
      style={tw`flex-row items-center p-3 border-b border-gray-200`}
      onPress={() => {
        onCurrencyChange(item.code);
        closeModal();
      }}
    >
      {item.type === 'crypto' ? (
        <Image source={{ uri: item.flag }} style={tw`w-6 h-6 mr-3`} />
      ) : (
        <Text style={tw`text-2xl mr-3`}>{item.flag}</Text>
      )}
      <Text style={tw`text-lg`}>
        {item.name} ({item.code})
      </Text>
    </TouchableOpacity>
  );
  return (
    <View style={tw`w-full max-w-md`}>
      <TouchableOpacity
        style={tw`flex-row items-center rounded-full px-4 py-2 mb-4`}
        onPress={() => {
          setIsDropdownVisible(true);
        }}
      >
        {selectedCurrencyData?.type === 'crypto' ? (
          <Image
            source={{ uri: selectedCurrencyData.flag }}
            style={tw`w-6 h-6 mr-2`}
          />
        ) : (
          <Text style={tw`text-white mr-2`}>{selectedCurrencyData?.flag}</Text>
        )}
        <Text style={tw`text-white font-bold`}>{selectedCurrency}</Text>
        <Text style={tw`text-white ml-2`}>▼</Text>
      </TouchableOpacity>

      <View style={tw`bg-gray-300 rounded-3xl p-2 pl-4 flex-row items-center`}>
        <Text style={tw`text-white text-3xl font-bold mr-2`}>
          {selectedCurrencyData?.symbol}
        </Text>
        <TextInput
          style={tw`flex-1 text-white text-xl font-bold`}
          value={amount}
          onChangeText={onAmountChange}
          keyboardType="numeric"
          placeholder="Enter amount"
          placeholderTextColor="#A0AEC0"
        />
      </View>
      <Modal
        visible={isDropdownVisible}
        transparent={true}
        animationType="fade"
      >
        <TouchableOpacity
          style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}
          activeOpacity={1}
          onPress={closeModal}
        >
          <View
            style={[
              tw`bg-white rounded-lg`,
              { width: width * 0.94, maxHeight: height },
            ]}
          >
            <View style={tw`p-4 border-b border-gray-200`}>
              <Text style={tw`text-2xl font-bold mb-2`}>Select Currency</Text>
              <TextInput
                style={tw`bg-gray-100 p-2 rounded-md`}
                placeholder="Search currencies"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <FlatList
              data={filteredCurrencies}
              renderItem={renderCurrencyItem}
              keyExtractor={(item) => item.code}
              style={{ maxHeight: height * 0.6 }}
            />
            {/* <TouchableOpacity
              style={tw`bg-blue-500 p-4 m-4 rounded`}
              onPress={() => setIsDropdownVisible(false)}
            >
              <Text style={tw`text-white text-center font-bold`}>Close</Text>
            </TouchableOpacity> */}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default CurrencySelector;
