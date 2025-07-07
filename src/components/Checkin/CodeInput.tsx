import React from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const CodeInput: React.FC<Props> = ({ value, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, '').slice(0, 5); // ← solo 5 dígitos
    onChange(input);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={handleChange}
      className="w-full text-center border border-gray-300 rounded-md py-3 text-xl tracking-widest bg-gray-100"
      placeholder="_____"
    />
  );
};

export default CodeInput;
