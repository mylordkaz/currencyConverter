// components/AddCurrencyModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import tw from 'twrnc';
import { Currency } from '@/constants/type';

interface AddCurrencyModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAddCurrency: (currency: Currency) => void;
  availableCurrencies: Currency[];
}

const AddCurrencyModal: React.FC<AddCurrencyModalProps> = ({
  isVisible,
  onClose,
  onAddCurrency,
  availableCurrencies,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCurrencies = availableCurrencies.filter(
    (currency) =>
      currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCurrencyItem = ({ item }: { item: Currency }) => (
    <TouchableOpacity
      style={tw`flex-row items-center p-3 border-b border-gray-200`}
      onPress={() => {
        onAddCurrency(item);
        onClose();
      }}
    >
      <Text style={tw`text-2xl mr-3`}>{item.flag}</Text>
      <Text style={tw`text-lg`}>
        {item.name} ({item.code})
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={tw`flex-1 bg-white mt-20`}>
        <View style={tw`p-4 border-b border-gray-200`}>
          <Text style={tw`text-2xl font-bold mb-2`}>Add Currency</Text>
          <TextInput
            style={tw`bg-gray-100 p-2 rounded`}
            placeholder="Search currencies..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <FlatList
          data={filteredCurrencies}
          renderItem={renderCurrencyItem}
          keyExtractor={(item) => item.code}
        />
        <TouchableOpacity
          style={tw`bg-blue-500 p-4 m-4 rounded`}
          onPress={onClose}
        >
          <Text style={tw`text-white text-center font-bold`}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default AddCurrencyModal;
