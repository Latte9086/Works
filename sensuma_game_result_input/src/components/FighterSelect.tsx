import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { FIGHTER_ITEMS } from '../constants/smashData';

interface FighterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// カタカナをひらがなに変換するヘルパー（検索用）
function toHiragana(str: string): string {
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

export const FighterSelect: React.FC<FighterSelectProps> = ({
  label,
  value,
  onChange,
  placeholder = 'ファイターを選択...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredFighters = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return FIGHTER_ITEMS;
    const hiraQuery = toHiragana(trimmed);
    return FIGHTER_ITEMS.filter(
      (f) =>
        f.name.toLowerCase().includes(trimmed) ||
        toHiragana(f.name.toLowerCase()).includes(hiraQuery) ||
        f.kana.toLowerCase().includes(hiraQuery) ||
        f.id.toLowerCase().includes(trimmed)
    );
  }, [query]);

  const handleOpen = () => {
    setIsOpen(true);
    setQuery('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleSelect = (fighterName: string) => {
    onChange(fighterName);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
        {label}
      </label>

      {!isOpen ? (
        <button
          type="button"
          onClick={handleOpen}
          className={`w-full min-h-[46px] px-3 py-2.5 text-left border border-black bg-white flex items-center justify-between text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black ${
            value ? 'text-black font-bold' : 'text-gray-500'
          }`}
        >
          <span className="truncate">{value || placeholder}</span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onChange('');
                  }
                }}
                className="p-1 text-gray-500 hover:text-black"
                aria-label="クリア"
              >
                <X className="w-4 h-4" />
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-black" />
          </div>
        </button>
      ) : (
        <div className="border border-black bg-white">
          <div className="flex items-center px-3 py-2 border-b border-black bg-white">
            <Search className="w-4 h-4 text-gray-600 mr-2 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="名前・かな・略称で検索..."
              className="w-full text-sm text-black bg-white focus:outline-none placeholder:text-gray-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredFighters.length > 0) {
                  e.preventDefault();
                  handleSelect(filteredFighters[0].name);
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
            />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 ml-1 text-gray-600 hover:text-black"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="max-h-60 overflow-y-auto divide-y divide-gray-200">
            {filteredFighters.length === 0 ? (
              <li className="px-3 py-3 text-sm text-gray-500 text-center">
                該当するファイターがありません
              </li>
            ) : (
              filteredFighters.map((fighter) => {
                const isSelected = fighter.name === value;
                return (
                  <li key={fighter.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(fighter.name)}
                      className={`w-full px-3 py-3 text-left text-sm flex items-center justify-between ${
                        isSelected
                          ? 'bg-black text-white font-bold'
                          : 'bg-white text-black hover:bg-gray-100 active:bg-black active:text-white'
                      }`}
                    >
                      <span>{fighter.name}</span>
                      <span
                        className={`text-xs font-mono ${
                          isSelected ? 'text-gray-300' : 'text-gray-400'
                        }`}
                      >
                        #{fighter.id}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

