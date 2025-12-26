'use client';

import PhoneInputWithCountry from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface PhoneInputProps {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export default function PhoneInput({ 
  value, 
  onChange, 
  placeholder = "Numéro de téléphone",
  className = ""
}: PhoneInputProps) {
  return (
    <div className={className}>
      <PhoneInputWithCountry
        international
        defaultCountry="CI"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 border-b-2 border-gray-200 dark:border-gray-700 focus:border-indigo-600 dark:focus:border-indigo-400 outline-none bg-transparent transition-colors"
        style={{ fontFamily: 'var(--font-poppins)' }}
      />
    </div>
  );
}

