import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import Swipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { RectButton } from 'react-native-gesture-handler';
import tw from 'twrnc';
import { Currency } from '@/constants/type';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
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

// Guard against react-native-reorderable-list calling keyExtractor with an
// out-of-range (undefined) item during the drag animation.
const rowKey = (row: CurrencyRow | undefined, index = 0): string => {
  if (!row) return `row-${index}`;
  return row.currency ? row.currency.id : `missing-${row.code}`;
};

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

// Fixed-width red button revealed when a row is swiped left. Tapping it removes
// the row. A fixed width (vs flex:1) keeps the panel from stretching full-bleed,
// and using a RectButton makes the tap reliable inside the swipeable.
const DELETE_ACTION_WIDTH = 92;
const DeleteAction: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <RectButton
    onPress={onPress}
    style={{ width: DELETE_ACTION_WIDTH, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}
  >
    <Ionicons name="trash-outline" size={20} color="#fff" />
    <Text style={{ fontFamily: MONO, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: '#fff', marginTop: 3 }}>DELETE</Text>
  </RectButton>
);

const CurrencyRowItem = ({
  row,
  baseCurrencyData,
  baseAmount,
  onRemove,
  openRowRef,
}: {
  row: CurrencyRow;
  baseCurrencyData: Currency;
  baseAmount: number;
  onRemove: (code: string) => void;
  // Shared across rows so only one can be open at a time.
  openRowRef: React.MutableRefObject<SwipeableMethods | null>;
}) => {
  const drag = useReorderableDrag();
  const isActive = useIsActive();
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  const removeCode = row.currency?.code ?? row.code;

  // Opening a row closes whichever row was open before it.
  const handleWillOpen = () => {
    if (openRowRef.current && openRowRef.current !== swipeableRef.current) {
      openRowRef.current.close();
    }
    openRowRef.current = swipeableRef.current;
  };
  const handleClose = () => {
    if (openRowRef.current === swipeableRef.current) openRowRef.current = null;
  };

  const renderRightActions = (
    _progress: unknown,
    _translation: unknown,
    methods: SwipeableMethods
  ) => (
    <DeleteAction
      onPress={() => {
        methods.close();
        openRowRef.current = null;
        onRemove(removeCode);
      }}
    />
  );

  // Saved code with no live match (e.g. a coin outside the current set):
  // muted "rate unavailable" row.
  if (!row.currency) {
    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        onSwipeableWillOpen={handleWillOpen}
        onSwipeableClose={handleClose}
        rightThreshold={40}
        overshootRight={false}
        friction={2}
      >
        <View style={[tw`flex-row items-center justify-between px-4`, { paddingVertical: 14, backgroundColor: C.panel, borderBottomWidth: 1, borderBottomColor: C.line }]}>
          <View style={tw`flex-row items-center`}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.raise, borderWidth: 1, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: MONO, fontSize: 12, fontWeight: '700', color: C.faint }}>{row.code.slice(0, 3)}</Text>
            </View>
            <Text style={{ fontFamily: MONO, fontWeight: '700', color: C.dim, fontSize: 14.5, marginLeft: 13, letterSpacing: 0.4 }}>{row.code}</Text>
          </View>
          <Text style={{ fontFamily: MONO, fontSize: 11, color: C.faint }}>rate unavailable</Text>
        </View>
      </Swipeable>
    );
  }

  const currency = row.currency;
  const convertedAmount = convertCurrency(baseAmount, baseCurrencyData, currency);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={handleWillOpen}
      onSwipeableClose={handleClose}
      rightThreshold={40}
      overshootRight={false}
      friction={2}
      enabled={!isActive}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={drag}
        delayLongPress={220}
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
    </Swipeable>
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
  // The single currently-open swipeable row, shared across all rows.
  const openRowRef = useRef<SwipeableMethods | null>(null);

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
    if (from < 0 || to < 0 || from === to || from >= rows.length) return;
    onReorderCurrencies(reorderItems(rows, from, to).map((r) => r.code));
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
            shouldUpdateActiveItem
            contentContainerStyle={{ paddingBottom: 96 }}
            renderItem={({ item }) => (
              <CurrencyRowItem
                row={item}
                baseCurrencyData={baseCurrencyData}
                baseAmount={baseAmount}
                onRemove={onRemoveCurrency}
                openRowRef={openRowRef}
              />
            )}
          />
        </View>
      )}
    </View>
  );
};

export default CurrencyList;
