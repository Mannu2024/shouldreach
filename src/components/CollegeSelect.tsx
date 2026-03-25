import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Plus } from 'lucide-react';
import { NIRF_COLLEGES } from '../data/colleges';

interface CollegeSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  cityValue?: string;
  onCityChange?: (value: string) => void;
  stateValue?: string;
  onStateChange?: (value: string) => void;
}

export function CollegeSelect({ 
  value, 
  onChange, 
  label = "University / College",
  cityValue,
  onCityChange,
  stateValue,
  onStateChange
}: CollegeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value && !NIRF_COLLEGES.includes(value)) {
      setIsCustom(true);
    }
  }, [value]);

  const filteredColleges = NIRF_COLLEGES.filter(college => 
    college.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (college: string) => {
    onChange(college);
    setIsCustom(false);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCustomSelect = () => {
    setIsCustom(true);
    onChange('');
    setIsOpen(false);
  };

  if (isCustom) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <button 
              type="button"
              onClick={() => {
                setIsCustom(false);
                onChange('');
                if (onCityChange) onCityChange('');
                if (onStateChange) onStateChange('');
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              Select from list
            </button>
          </div>
          <input 
            type="text" 
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Enter your college or university name"
            className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {(onCityChange || onStateChange) && (
          <div className="grid grid-cols-2 gap-4">
            {onCityChange && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">College City (Optional)</label>
                <input 
                  type="text" 
                  value={cityValue || ''}
                  onChange={e => onCityChange(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {onStateChange && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">College State (Optional)</label>
                <input 
                  type="text" 
                  value={stateValue || ''}
                  onChange={e => onStateChange(e.target.value)}
                  placeholder="e.g. Maharashtra"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div 
        className="w-full border border-slate-300 rounded-lg px-4 py-2 flex items-center justify-between cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-slate-900 truncate pr-4" : "text-slate-400"}>
          {value || "Select your college/university"}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 flex flex-col">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white rounded-t-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search colleges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredColleges.length > 0 ? (
              filteredColleges.map((college, index) => (
                <div
                  key={index}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer rounded-md text-sm text-slate-700 flex items-center justify-between"
                  onClick={() => handleSelect(college)}
                >
                  <span className="truncate pr-2">{college}</span>
                  {value === college && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-slate-500">
                No colleges found matching "{searchTerm}"
              </div>
            )}
            <div className="border-t border-slate-100 my-1"></div>
            <div
              className="px-3 py-2 hover:bg-slate-50 cursor-pointer rounded-md text-sm text-blue-600 font-medium flex items-center"
              onClick={handleCustomSelect}
            >
              <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
              My college/university is not listed
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
