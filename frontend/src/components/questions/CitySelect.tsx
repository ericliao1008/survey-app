import { useMemo, useState } from "react";
import type { Question } from "@/lib/types";
import { PROVINCES, searchCitiesByProvince } from "@/data/chinaCitiesByProvince";
import { searchCities } from "@/data/chinaCities";

interface Props {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}

export function CitySelect({ value, onChange }: Props) {
  const [province, setProvince] = useState("");
  const [inputVal, setInputVal] = useState(value);
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    if (!focused) return [];
    if (province) return searchCitiesByProvince(province, inputVal, 15);
    return inputVal.trim() ? searchCities(inputVal, 15) : [];
  }, [focused, province, inputVal]);

  function selectCity(city: string) {
    setInputVal(city);
    onChange(city);
    setFocused(false);
  }

  function handleProvinceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setProvince(e.target.value);
    setInputVal("");
    onChange("");
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 省份选择器 */}
      <div className="relative">
        <select
          value={province}
          onChange={handleProvinceChange}
          className="w-full appearance-none border-b border-paper-400 bg-transparent py-2 pr-6 font-serif text-base text-paper-900 focus:border-paper-900 focus:outline-none"
        >
          <option value="">全部省份 / 直辖市</option>
          {PROVINCES.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-paper-400 text-xs">▾</span>
      </div>

      {/* 城市搜索输入框 */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={inputVal}
            placeholder={province ? `在 ${province} 中搜索城市、区县…` : "输入城市 / 区县 / 乡镇名称搜索…"}
            autoComplete="off"
            maxLength={50}
            className="w-full border-b border-paper-400 bg-transparent py-2 pr-6 font-serif text-base text-paper-900 placeholder-paper-400 focus:border-paper-900 focus:outline-none"
            onChange={(e) => { setInputVal(e.target.value); onChange(e.target.value); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
          />
          <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-paper-400 text-xs">▾</span>
        </div>

        {focused && suggestions.length > 0 && (
          <ul
            className="absolute left-0 right-0 mt-1 z-10 bg-paper-50 border border-paper-300 rounded-sm shadow-lg max-h-64 overflow-auto"
            role="listbox"
          >
            {suggestions.map((city) => (
              <li key={city}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectCity(city); }}
                  className="w-full text-left px-4 py-2 font-serif text-base text-paper-900 hover:bg-paper-100"
                >
                  {city}
                </button>
              </li>
            ))}
          </ul>
        )}

        {focused && province && !inputVal.trim() && suggestions.length === 0 && (
          <div className="absolute left-0 right-0 mt-1 z-10 bg-paper-50 border border-paper-300 rounded-sm shadow px-4 py-3 font-serif text-sm text-paper-500">
            输入关键词搜索 {province} 的城市
          </div>
        )}
      </div>

      <p className="font-serif text-xs text-paper-500">
        可先选省份缩小范围，再输入城市名；也可直接输入任意地名
      </p>
    </div>
  );
}
