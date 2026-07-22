import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import tw from 'twrnc';
import { Currency } from '@/constants/type';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import ReorderableList, {
  ReorderableListReorderEvent,
  reorderItems,
  useIsActive,
  useReorderableDrag,
} from 'react-native-reorderable-list';
import { convertCurrency, formatAmount, getDescription } from '@/lib/currency';
import { C, MONO } from '@/constants/theme';
import CurrencyIcon from './CurrencyIcon';

interface CurrencyListProps {
  currencies: Currency[];
  selectedCurrencyCodes: string[];
  baseCurrency: string;
  baseAmount: number;
  isLoading: boolean;
  fiatError: string | null;
  cryptoError: string | null;
  onRemoveCurrency: (currencyCode: string) => void;
  onReorderCurrencies: (newOrder: string[]) => void;
}

/** A selected code paired with its live currency data (null => unresolved). */
interface CurrencyRow {
  code: string;
  currency: Currency | null;
}

const rowKey = (row: CurrencyRow): string =>
  row.currency ? row.currency.id : `missing-${row.code}`;

const Tag: React.FC<{ type: Currency['type'] }> = ({ type }) => {
  const crypto = type === 'crypto';
  return (
    <View
      style={{
        marginLeft: 8,
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: crypto ? C.blueSoft : C.raise,
        borderColor: crypto ? C.blueLine : C.line2,
      }}
    >
      <Text style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: '600', letterSpacing: 1, color: crypto ? C.blueBright : C.faint }}>
        {crypto ? 'CRYPTO' : 'FIAT'}
      </Text>
    </View>
  );
};

const DeleteAction: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <RectButton
    style={{ backgroundColor: '#e5484d', borderRadius: 14, justifyContent: 'center', alignItems: 'center', width: 60, marginVertical: 5, marginLeft: 8 }}
    onPress={onPress}
  >
    <Ionicons name="trash-outline" size={22} color="#fff" />
  </RectButton>
);

const CurrencyRowItem = ({
  row,
  baseCurrencyData,
  baseAmount,
  onRemove,
}: {
  row: CurrencyRow;
  baseCurrencyData: Currency;
  baseAmount: number;
  onRemove: (code: string) => void;
}) => {
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  // Saved code with no live match (e.g. a coin outside the current set):
  // muted "rate unavailable" row, still swipe-to-delete-able.
  if (!row.currency) {
    return (
      <ReanimatedSwipeable renderRightActions={() => <DeleteAction onPress={() => onRemove(row.code)} />}>
        <View style={[tw`flex-row items-center justify-between px-4`, { paddingVertical: 14, backgroundColor: C.panel, borderBottomWidth: 1, borderBottomColor: C.line }]}>
          <View style={tw`flex-row items-center`}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.raise, borderWidth: 1, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: MONO, fontSize: 12, fontWeight: '700', color: C.faint }}>{row.code.slice(0, 3)}</Text>
            </View>
            <Text style={{ fontFamily: MONO, fontWeight: '700', color: C.dim, fontSize: 14.5, marginLeft: 13, letterSpacing: 0.4 }}>{row.code}</Text>
          </View>
          <Text style={{ fontFamily: MONO, fontSize: 11, color: C.faint }}>rate unavailable</Text>
        </View>
      </ReanimatedSwipeable>
    );
  }

  const currency = row.currency;
  const convertedAmount = convertCurrency(baseAmount, baseCurrencyData, currency);

  return (
    <ReanimatedSwipeable renderRightActions={() => <DeleteAction onPress={() => onRemove(currency.code)} />}>
      <TouchableOpacity
        activeOpacity={0.7}
        onLongPress={drag}
        style={[
          tw`flex-row items-center px-4`,
          { paddingVertical: 14, backgroundColor: isActive ? C.raise : C.panel, borderBottomWidth: 1, borderBottomColor: C.line },
        ]}
      >
        <CurrencyIcon currency={currency} size={42} />
        <View style={tw`ml-3 flex-1`}>
          <View style={tw`flex-row items-center`}>
            <Text style={{ fontFamily: MONO, fontWeight: '700', color: C.text, fontSize: 14.5, letterSpacing: 0.4 }}>{currency.code}</Text>
            <Tag type={currency.type} />
          </View>
          <Text style={{ color: C.faint, fontSize: 12.5, marginTop: 2 }} numberOfLines={1}>{currency.name}</Text>
        </View>
        <View style={tw`items-end`}>
          <Text style={{ fontFamily: MONO, fontWeight: '600', color: C.text, fontSize: 16.5 }}>
            {convertedAmount !== null ? formatAmount(convertedAmount) : '0.00'}
          </Text>
          <Text style={{ fontFamily: MONO, fontSize: 10.5, color: C.faint, marginTop: 3 }}>
            {getDescription(currency, baseCurrencyData)}
          </Text>
        </View>
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
};

const SectionHead: React.FC<{ count: number }> = ({ count }) => (
  <View style={tw`flex-row items-baseline justify-between px-1 pb-3`}>
    <Text style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 2, color: C.dim, fontWeight: '700' }}>MY CURRENCIES</Text>
    <Text style={{ fontFamily: MONO, fontSize: 10.5, color: C.faint }}>{count}</Text>
  </View>
);

const CurrencyList: React.FC<CurrencyListProps> = ({
  currencies,
  selectedCurrencyCodes,
  baseCurrency,
  baseAmount,
  isLoading,
  fiatError,
  cryptoError,
  onRemoveCurrency,
  onReorderCurrencies,
}) => {
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const rows = useMemo<CurrencyRow[]>(
    () =>
      selectedCurrencyCodes.map((code) => ({
        code,
        currency: currencies.find((c) => c.code === code) ?? null,
      })),
    [currencies, selectedCurrencyCodes]
  );

  const baseCurrencyData = useMemo(
    () => currencies.find((c) => c.code === baseCurrency) ?? null,
    [currencies, baseCurrency]
  );

  const handleReorder = ({ from, to }: ReorderableListReorderEvent) => {
    onReorderCurrencies(reorderItems(selectedCurrencyCodes, from, to));
  };

  if (isLoading) {
    return (
      <View style={tw`flex-1 items-center justify-center`}>
        <ActivityIndicator size="large" color={C.blue} />
      </View>
    );
  }

  // Full error state only when both sources failed and there is nothing to show.
  if (fiatError && cryptoError && currencies.length === 0) {
    return (
      <View style={tw`flex-1`}>
        <SectionHead count={0} />
        <View style={[tw`rounded-2xl p-5`, { backgroundColor: C.panel, borderWidth: 1, borderColor: C.line }]}>
          <Text style={{ color: C.red, fontSize: 13.5 }}>{fiatError}</Text>
          <Text style={{ color: C.red, fontSize: 13.5, marginTop: 4 }}>{cryptoError}</Text>
        </View>
      </View>
    );
  }

  const activeError = fiatError ?? cryptoError;

  return (
    <View style={tw`flex-1`}>
      <SectionHead count={rows.length} />

      {activeError && !bannerDismissed && (
        <View style={[tw`flex-row items-center justify-between rounded-xl p-3 mb-3`, { backgroundColor: 'rgba(229,72,77,0.14)', borderWidth: 1, borderColor: 'rgba(229,72,77,0.4)' }]}>
          <Text style={{ color: C.red, flex: 1, marginRight: 8, fontSize: 12.5 }}>{activeError}</Text>
          <TouchableOpacity onPress={() => setBannerDismissed(true)} hitSlop={8}>
            <Ionicons name="close" size={18} color={C.red} />
          </TouchableOpacity>
        </View>
      )}

      {!baseCurrencyData ? (
        <Text style={{ color: C.red, paddingHorizontal: 4 }}>Base currency not found</Text>
      ) : rows.length === 0 ? (
        <View style={[tw`rounded-2xl p-6 items-center`, { backgroundColor: C.panel, borderWidth: 1, borderColor: C.line }]}>
          <Text style={{ color: C.faint, fontSize: 13 }}>No currencies yet — tap + to add.</Text>
        </View>
      ) : (
        <View style={[tw`flex-1 rounded-2xl`, { backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }]}>
          <ReorderableList
            data={rows}
            onReorder={handleReorder}
            keyExtractor={rowKey}
            renderItem={({ item }) => (
              <CurrencyRowItem
                row={item}
                baseCurrencyData={baseCurrencyData}
                baseAmount={baseAmount}
                onRemove={onRemoveCurrency}
              />
            )}
          />
        </View>
      )}
    </View>
  );
};

export default CurrencyList;
