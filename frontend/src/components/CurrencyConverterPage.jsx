import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { convertCurrency, convertBatch } from "../api";

const STANDARD_AMOUNTS = [1, 10, 100, 1000];

export default function CurrencyConverterPage({ tripDetails, onBack }) {
  const rawList = tripDetails?.currencies || [];
  // Ensure INR and USD are always in the list
  const currencyList = useMemo(() => {
    const set = new Set(rawList);
    set.add("INR");
    set.add("USD");
    return Array.from(set);
  }, [rawList]);

  const otherCurrencies = useMemo(
    () => currencyList.filter((c) => c !== "INR"),
    [currencyList]
  );

  // Live converter state
  const [fromCurrency, setFromCurrency] = useState(currencyList[0] || "USD");
  const [toCurrency, setToCurrency] = useState(
    currencyList.length > 1 ? currencyList[1] : "INR"
  );
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(null);
  const [rate, setRate] = useState(null);
  const [converting, setConverting] = useState(false);
  const debounceRef = useRef(null);

  // Rate tables state
  const [inrToOthers, setInrToOthers] = useState({});
  const [othersToInr, setOthersToInr] = useState({});
  const [loadingTables, setLoadingTables] = useState(true);

  // Load rate tables on mount
  useEffect(() => {
    (async () => {
      setLoadingTables(true);
      try {
        const [fromInr, toInr] = await Promise.all([
          convertBatch("INR", otherCurrencies),
          // For others→INR, fetch each one with base=currency, target=INR
          Promise.all(
            otherCurrencies.map(async (c) => {
              const data = await convertBatch(c, ["INR"]);
              return { currency: c, rate: data.rates?.INR || 0 };
            })
          ),
        ]);
        setInrToOthers(fromInr.rates || {});
        const toInrMap = {};
        toInr.forEach((item) => {
          toInrMap[item.currency] = item.rate;
        });
        setOthersToInr(toInrMap);
      } catch {
        /* ignore */
      } finally {
        setLoadingTables(false);
      }
    })();
  }, [otherCurrencies]);

  // Live conversion with debounce
  const doConvert = useCallback(
    async (val, from, to) => {
      const num = parseFloat(val);
      if (!num || num <= 0) {
        setResult(null);
        setRate(null);
        return;
      }
      setConverting(true);
      try {
        const data = await convertCurrency(from, to, num);
        setResult(data.result);
        setRate(data.rate);
      } catch {
        setResult(null);
        setRate(null);
      } finally {
        setConverting(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doConvert(amount, fromCurrency, toCurrency);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [amount, fromCurrency, toCurrency, doConvert]);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
    setRate(null);
  };

  return (
    <div className="container mx-auto py-4 md:py-8 px-4 max-w-4xl">
      <button
        onClick={onBack}
        className="flex items-center text-emerald-600 font-semibold mb-6 hover:translate-x-[-4px] transition-transform"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Trip
      </button>

      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Currency Converter</h2>
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{tripDetails?.name}</span>
          </p>
        </div>
      </div>

      {/* Live Converter */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 text-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Enter amount..."
              autoFocus
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">From</label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 bg-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {currencyList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={swapCurrencies}
            className="self-center md:self-end p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
            title="Swap currencies"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">To</label>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 bg-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {currencyList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Live result */}
        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 min-h-[72px] flex items-center">
          {result !== null ? (
            <div>
              <p className="text-2xl md:text-3xl font-bold font-mono text-emerald-700">
                {parseFloat(amount).toLocaleString()} {fromCurrency} ={" "}
                {result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {toCurrency}
              </p>
              {rate && (
                <p className="text-xs text-emerald-500 mt-1">
                  1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
                </p>
              )}
            </div>
          ) : converting ? (
            <p className="text-sm text-emerald-400 font-medium">Converting...</p>
          ) : (
            <p className="text-sm text-gray-400">Type an amount to see live conversion</p>
          )}
        </div>
      </div>

      {/* Rate Tables */}
      {loadingTables ? (
        <div className="text-center py-12">
          <p className="text-gray-400 font-medium text-sm">Loading exchange rates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* INR → Others */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-100">
              <h3 className="text-sm font-bold text-emerald-800">INR → Other Currencies</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 uppercase text-[10px] tracking-wider">
                    <th className="px-5 py-2.5 text-left border-b font-bold">INR</th>
                    <th className="px-5 py-2.5 text-left border-b font-bold">Currency</th>
                    <th className="px-5 py-2.5 text-right border-b font-bold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {otherCurrencies.map((cur) => {
                    const r = inrToOthers[cur] || 0;
                    return STANDARD_AMOUNTS.map((amt) => (
                      <tr key={`inr-${cur}-${amt}`} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-2 font-mono text-gray-600">{amt.toLocaleString()}</td>
                        <td className="px-5 py-2 font-semibold text-gray-800">{cur}</td>
                        <td className="px-5 py-2 text-right font-mono font-bold text-emerald-600">
                          {(amt * r).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Others → INR */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="bg-blue-50 px-5 py-3 border-b border-blue-100">
              <h3 className="text-sm font-bold text-blue-800">Other Currencies → INR</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 uppercase text-[10px] tracking-wider">
                    <th className="px-5 py-2.5 text-left border-b font-bold">Amount</th>
                    <th className="px-5 py-2.5 text-left border-b font-bold">Currency</th>
                    <th className="px-5 py-2.5 text-right border-b font-bold">INR</th>
                  </tr>
                </thead>
                <tbody>
                  {otherCurrencies.map((cur) => {
                    const r = othersToInr[cur] || 0;
                    return STANDARD_AMOUNTS.map((amt) => (
                      <tr key={`to-inr-${cur}-${amt}`} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-2 font-mono text-gray-600">{amt.toLocaleString()}</td>
                        <td className="px-5 py-2 font-semibold text-gray-800">{cur}</td>
                        <td className="px-5 py-2 text-right font-mono font-bold text-blue-600">
                          {(amt * r).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
