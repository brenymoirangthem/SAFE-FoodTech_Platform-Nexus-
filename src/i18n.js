import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          "email": "Email Address",
          "password": "Password",
          "full_name": "Full Name",
          "phone": "Phone Number",
          "signin": "Sign In",
          "create_account": "Create Account",
          "processing": "Processing...",
          "install": "Install App",
          "offline_login_msg": "Internet connection required to log in.",
          "role_consumer": "Consumer",
          "role_supplier": "Supplier",
          "role_emergency": "Emergency",
          "sub_consumer": "Request food & aid",
          "sub_supplier": "Manage inventory",
          "sub_emergency": "Official response",
          "back_login": "Back to Login",
          "new_here": "New here? Create Account",
          "official_only": "Restricted to authorized personnel",
          "reset_password": "Reset Password",
          "enter_email": "Enter your email",
          "new_password": "New Password",
          "update_pass": "Update Password",
          "pass_updated": "Password updated successfully",
          "email_not_found": "Email not found",
          "restricted_reg": "Emergency accounts cannot be created publicly.",
          "center_setup_title": "Setup Distribution Center",
          "center_name": "Center Name",
          "address": "Full Address",
          "latitude": "Latitude",
          "longitude": "Longitude",
          "register_center": "Register Center",
          "crowd_level": "Crowd Level",
          "status": "Status",
          "open": "Open",
          "closed": "Closed",
          "low": "Low",
          "medium": "Medium",
          "high": "High"
        }
      }
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    },
    react: {
        useSuspense: false
    }
  });

export default i18n;