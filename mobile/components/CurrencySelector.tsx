import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

const CurrencySelector = () => {
  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState('');

  return (
    <View style={tw`w-full max-w-md`}>
      <TouchableOpacity
        style={tw`flex-row items-center rounded-full px-4 py-2 mb-4`}
        onPress={() => {
          /* Handle currency selection */
        }}
      >
        <Text style={tw`text-white mr-2`}>🇺🇸</Text>
        <Text style={tw`text-white font-bold`}>{currency}</Text>
        <Text style={tw`text-white ml-2`}>▼</Text>
      </TouchableOpacity>

      <View style={tw`bg-gray-300 rounded-3xl p-2 pl-4 flex-row items-center`}>
        <Text style={tw`text-white text-3xl font-bold mr-2`}>$</Text>
        <TextInput
          style={tw`flex-1 text-white text-xl font-bold`}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="Enter amount"
          placeholderTextColor="#A0AEC0"
        />
      </View>
    </View>
  );
};

export default CurrencySelector;
