import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = ({ className = '' }) => {
  const { i18n } = useTranslation();

  const changeLanguage = (e) => {
    const lng = e.target.value;
    i18n.changeLanguage(lng);
    // Detection plugin usually handles localStorage, but we can be explicit
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <div className={`lang-switcher ${className}`}>
      <select 
        value={i18n.language} 
        onChange={changeLanguage}
        className="lang-select"
      >
        <option value="zh-TW">繁體中文</option>
        <option value="en">English</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
