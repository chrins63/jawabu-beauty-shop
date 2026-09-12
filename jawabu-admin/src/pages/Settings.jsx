import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Home,
  ShoppingCart,
  CreditCard,
  Package,
  Users,
  Bell,
  ShieldCheck,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Copy,
  RotateCcw,
  X,
  AlertTriangle,
  Smartphone,
  Truck,
  Mail,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { dispatchSms } from '../lib/sms';
import { dispatchEmail } from '../lib/email';
import './settings.css';

const MPESA_CALLBACK_URL = `${String(
  import.meta.env.VITE_SUPABASE_URL ||
    'https://lerdicfcjfbdxfbjgiri.supabase.co'
).replace(/\/$/, '')}/functions/v1/mpesa-stk-callback`;

const DEFAULT_SETTINGS = {
  general: {
    business_name: 'Sleek Sisters',
    business_tagline: 'Your one-stop beauty & lifestyle store',
    email: '',
    phone: '0143074416',
    whatsapp_number: '0143074416',
    pickup_address:
      'Nairobi — we confirm the exact collection point after you order.',
    address: '',
    city: 'Nairobi',
    country: 'Kenya',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
  },

  homepage: {
    hero_title: 'Look Good. Feel Beautiful.',
    hero_subtitle:
      'Premium skincare, fragrances and stylish accessories at prices that feel good.',
    hero_image: '',
    secondary_image: '',
    banner_image: '',
    show_featured_products: true,
    show_categories: true,
    show_services: false,
  },

  orders: {
    order_prefix: 'SS',
    next_order_number: 1001,
    default_status: 'pending',
    allow_order_cancellation: true,
    cancellation_hours: 24,
    require_customer_phone: false,
  },

  payments: {
    cash_enabled: true,
    mpesa_enabled: true,
    mpesa_till: '',
    mpesa_paybill: '',
    mpesa_account_name: 'Sleek Sisters',
    card_enabled: true,
    bank_enabled: true,
    default_method: 'cash',
    require_transaction_id: false,
  },

  inventory: {
    low_stock_threshold: 5,
    allow_negative_stock: false,
    auto_update_stock: true,
    track_inventory_movements: true,
  },

  notifications: {
    order_notifications: true,
    payment_notifications: true,
    low_stock_notifications: true,
    staff_notifications: true,
  },

  sms: {
    payment_thanks_enabled: true,
    new_product_alerts_enabled: true,
    store_public_url: 'http://localhost:5174',
  },

  security: {
    session_timeout: 60,
    require_strong_password: true,
    allow_multiple_sessions: true,
  },
};

const SECTIONS = [
  {
    id: 'general',
    label: 'General',
    description: 'Business information',
    icon: Building2,
  },
  {
    id: 'homepage',
    label: 'Homepage',
    description: 'Website content & images',
    icon: Home,
  },
  {
    id: 'orders',
    label: 'Orders',
    description: 'Order configuration',
    icon: ShoppingCart,
  },
  {
    id: 'payments',
    label: 'Payments',
    description: 'Payment methods',
    icon: CreditCard,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Stock management',
    icon: Package,
  },
  {
    id: 'staff',
    label: 'Staff',
    description: 'Users & permissions',
    icon: Users,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'System notifications',
    icon: Bell,
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Customer text alerts',
    icon: Smartphone,
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Sleek Sisters mailbox',
    icon: Mail,
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Security preferences',
    icon: ShieldCheck,
  },
];

function Settings() {
  const { user } = useAuth();

  const [settings, setSettings] = useState(
    structuredClone(DEFAULT_SETTINGS)
  );

  const [activeSection, setActiveSection] =
    useState('general');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');

  const [dirtySections, setDirtySections] =
    useState({});

  const [showResetModal, setShowResetModal] =
    useState(false);

  const [pendingSection, setPendingSection] =
    useState(null);

  const [smsProvider, setSmsProvider] = useState({
    username: '',
    api_key: '',
    sender_id: '',
    configured: false,
  });
  const [smsTestPhone, setSmsTestPhone] = useState('');
  const [smsBusy, setSmsBusy] = useState(false);
  const [emailProvider, setEmailProvider] = useState({
    from_name: 'Sleek Sisters',
    from_email: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 465,
    username: '',
    password: '',
    admin_login_url: 'http://localhost:5176',
    configured: false,
  });
  const [emailTestTo, setEmailTestTo] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [mpesaProvider, setMpesaProvider] = useState({
    environment: 'sandbox',
    consumer_key: '',
    consumer_secret: '',
    shortcode: '',
    passkey: '',
    party_type: 'till',
    configured: false,
  });
  const [mpesaBusy, setMpesaBusy] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState([]);

  useEffect(() => {
    loadSettings();
  }, []);

  // =========================================================
  // LOAD SETTINGS
  // =========================================================

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data, error: settingsError } =
        await supabase
          .from('settings')
          .select('*')
          .order('category');

      if (settingsError) {
        throw settingsError;
      }

      const merged =
        structuredClone(DEFAULT_SETTINGS);

      for (const row of data || []) {
        if (
          row.category &&
          row.setting_key &&
          Object.prototype.hasOwnProperty.call(
            merged,
            row.category
          )
        ) {
          merged[row.category][row.setting_key] =
            row.setting_value;
        }
      }

      setSettings(merged);
      setDirtySections({});

      const { data: smsStatus } = await supabase.rpc(
        'get_sms_provider_status'
      );

      if (smsStatus) {
        setSmsProvider({
          username: smsStatus.username || '',
          api_key: '',
          sender_id: smsStatus.sender_id || '',
          configured: Boolean(smsStatus.configured),
        });
      }

      const { data: emailStatus } = await supabase.rpc(
        'get_email_provider_status'
      );

      if (emailStatus) {
        setEmailProvider((current) => ({
          ...current,
          from_name: emailStatus.from_name || 'Sleek Sisters',
          from_email: emailStatus.from_email || '',
          smtp_host: emailStatus.smtp_host || 'smtp.gmail.com',
          smtp_port: emailStatus.smtp_port || 465,
          username: emailStatus.username || '',
          password: '',
          admin_login_url: emailStatus.admin_login_url || current.admin_login_url,
          configured: Boolean(emailStatus.configured),
        }));
      }

      const { data: mpesaStatus } = await supabase.rpc(
        'get_mpesa_provider_status'
      );

      if (mpesaStatus) {
        setMpesaProvider({
          environment: mpesaStatus.environment || 'sandbox',
          consumer_key: '',
          consumer_secret: '',
          shortcode: mpesaStatus.shortcode || '',
          passkey: '',
          party_type: mpesaStatus.party_type || 'till',
          configured: Boolean(mpesaStatus.configured),
        });
      }

      const { data: options } = await supabase
        .from('delivery_options')
        .select('*')
        .order('sort_order');

      setDeliveryOptions(options || []);
    } catch (err) {
      console.error(
        'Settings loading error:',
        err
      );

      setError(
        `Unable to load settings: ${
          err.message || 'Unknown error'
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // UPDATE SETTING
  // =========================================================

  const updateSetting = (
    category,
    key,
    value
  ) => {
    setSettings((current) => ({
      ...current,
      [category]: {
        ...current[category],
        [key]: value,
      },
    }));

    setDirtySections((current) => ({
      ...current,
      [category]: true,
    }));

    setMessage('');
    setError('');
  };

  // =========================================================
  // SAVE CATEGORY
  // =========================================================

  const saveCategory = async (category) => {
    if (!user?.id) {
      setError(
        'You must be logged in to save settings.'
      );
      return;
    }

    const validationError =
      validateCategory(category);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (category === 'email') {
        const { error: emailError } = await supabase.rpc(
          'save_email_provider',
          {
            p_from_name: emailProvider.from_name,
            p_from_email: emailProvider.from_email,
            p_smtp_host: emailProvider.smtp_host,
            p_smtp_port: Number(emailProvider.smtp_port || 465),
            p_username: emailProvider.username,
            p_password: emailProvider.password,
            p_admin_login_url: emailProvider.admin_login_url,
          }
        );

        if (emailError) {
          throw emailError;
        }

        setEmailProvider((current) => ({
          ...current,
          password: '',
          configured:
            current.configured || Boolean(current.password.trim()),
        }));

        setDirtySections((current) => ({
          ...current,
          email: false,
        }));

        setMessage('Email settings saved successfully.');
        return;
      }

      const values = settings[category];

      for (const [key, value] of Object.entries(
        values
      )) {
        const { error: saveError } =
          await supabase
            .from('settings')
            .upsert(
              {
                category,
                setting_key: key,
                setting_value: value,
                updated_by: user.id,
                updated_at:
                  new Date().toISOString(),
              },
              {
                onConflict:
                  'category,setting_key',
              }
            );

        if (saveError) {
          throw saveError;
        }
      }

      if (category === 'sms') {
        const { error: providerError } = await supabase.rpc(
          'save_sms_provider',
          {
            p_username: smsProvider.username,
            p_api_key: smsProvider.api_key,
            p_sender_id: smsProvider.sender_id,
          }
        );

        if (providerError) {
          throw providerError;
        }

        setSmsProvider((current) => ({
          ...current,
          api_key: '',
          configured:
            current.configured || Boolean(current.api_key.trim()),
        }));
      }

      if (category === 'payments') {
        const till = String(settings.payments.mpesa_till || '').trim();
        const paybill = String(settings.payments.mpesa_paybill || '').trim();
        const shortcode =
          mpesaProvider.shortcode.trim() ||
          (mpesaProvider.party_type === 'paybill' ? paybill : till);

        const { error: mpesaError } = await supabase.rpc(
          'save_mpesa_provider',
          {
            p_environment: mpesaProvider.environment,
            p_consumer_key: mpesaProvider.consumer_key,
            p_consumer_secret: mpesaProvider.consumer_secret,
            p_shortcode: shortcode,
            p_passkey: mpesaProvider.passkey,
            p_party_type: mpesaProvider.party_type,
          }
        );

        if (mpesaError) {
          throw mpesaError;
        }

        const { data: mpesaStatus } = await supabase.rpc(
          'get_mpesa_provider_status'
        );

        if (mpesaStatus) {
          setMpesaProvider({
            environment: mpesaStatus.environment || 'sandbox',
            consumer_key: '',
            consumer_secret: '',
            shortcode: mpesaStatus.shortcode || shortcode,
            passkey: '',
            party_type: mpesaStatus.party_type || 'till',
            configured: Boolean(mpesaStatus.configured),
          });
        } else {
          setMpesaProvider((current) => ({
            ...current,
            consumer_key: '',
            consumer_secret: '',
            passkey: '',
            shortcode,
            configured:
              current.configured ||
              Boolean(
                current.consumer_key.trim() &&
                  current.consumer_secret.trim() &&
                  shortcode &&
                  current.passkey.trim()
              ),
          }));
        }
      }

      if (category === 'orders') {
        for (const option of deliveryOptions) {
          const { error: optionError } = await supabase
            .from('delivery_options')
            .update({
              name: option.name,
              description: option.description,
              eta: option.eta,
              fee: Number(option.fee) || 0,
              active: Boolean(option.active),
              updated_at: new Date().toISOString(),
            })
            .eq('id', option.id);

          if (optionError) {
            throw optionError;
          }
        }
      }

      setDirtySections((current) => ({
        ...current,
        [category]: false,
      }));

      setMessage(
        `${getSectionLabel(
          category
        )} settings saved successfully.`
      );
    } catch (err) {
      console.error(
        'Settings save error:',
        err
      );

      setError(
        `Unable to save settings: ${
          err.message ||
          'Unknown error'
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // VALIDATION
  // =========================================================

  const validateCategory = (category) => {
    const data = settings[category];

    if (!data) {
      return null;
    }

    if (category === 'general') {
      if (
        data.email &&
        !isValidEmail(data.email)
      ) {
        return 'Please enter a valid business email address.';
      }

      if (
        data.phone &&
        !isValidKenyanPhone(data.phone)
      ) {
        return 'Please enter a valid Kenyan phone number, for example 0712345678 or +254712345678.';
      }
    }

    if (category === 'orders') {
      if (
        !Number.isInteger(
          Number(data.next_order_number)
        ) ||
        Number(data.next_order_number) < 1
      ) {
        return 'Next order number must be a whole number greater than 0.';
      }

      if (
        Number(data.cancellation_hours) <
          0 ||
        Number(data.cancellation_hours) >
          720
      ) {
        return 'Cancellation window must be between 0 and 720 hours.';
      }

      if (
        !data.order_prefix?.trim()
      ) {
        return 'Order prefix cannot be empty.';
      }

      if (
        data.order_prefix.length >
        10
      ) {
        return 'Order prefix cannot exceed 10 characters.';
      }
    }

    if (category === 'inventory') {
      if (
        Number(data.low_stock_threshold) <
          0 ||
        Number(data.low_stock_threshold) >
          100000
      ) {
        return 'Low stock threshold must be between 0 and 100,000.';
      }
    }

    if (category === 'security') {
      if (
        Number(data.session_timeout) <
          5 ||
        Number(data.session_timeout) >
          1440
      ) {
        return 'Session timeout must be between 5 and 1,440 minutes.';
      }
    }

    return null;
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email.trim()
    );
  };

  const isValidKenyanPhone = (phone) => {
    const cleaned = phone
      .replace(/[\s-]/g, '');

    return (
      /^(?:\+254|254|0)(7|1)\d{8}$/.test(
        cleaned
      )
    );
  };

  // =========================================================
  // RESET
  // =========================================================

  const requestReset = () => {
    if (!dirtySections[activeSection]) {
      resetCategory();
      return;
    }

    setShowResetModal(true);
  };

  const resetCategory = () => {
    setSettings((current) => ({
      ...current,
      [activeSection]:
        structuredClone(
          DEFAULT_SETTINGS[
            activeSection
          ]
        ),
    }));

    setDirtySections((current) => ({
      ...current,
      [activeSection]: true,
    }));

    setShowResetModal(false);

    setMessage(
      `${getSectionLabel(
        activeSection
      )} has been reset locally. Click Save Changes to apply the defaults.`
    );
  };

  // =========================================================
  // SECTION NAVIGATION GUARD
  // =========================================================

  const requestSectionChange = (
    sectionId
  ) => {
    if (
      sectionId === activeSection
    ) {
      return;
    }

    if (
      dirtySections[activeSection]
    ) {
      setPendingSection(sectionId);
      return;
    }

    setActiveSection(sectionId);
    setMessage('');
    setError('');
  };

  const discardAndSwitch = () => {
    const category =
      activeSection;

    setSettings((current) => ({
      ...current,
      [category]:
        structuredClone(
          DEFAULT_SETTINGS[category]
        ),
    }));

    /*
      We don't want to reset the actual saved
      values when discarding changes.

      Therefore reload the database values
      before switching.
    */

    loadSettings().then(() => {
      if (pendingSection) {
        setActiveSection(
          pendingSection
        );
      }

      setPendingSection(null);
    });
  };

  const saveAndSwitch = async () => {
    const category =
      activeSection;

    const validationError =
      validateCategory(category);

    if (validationError) {
      setError(validationError);
      setPendingSection(null);
      return;
    }

    await saveCategory(category);

    setActiveSection(
      pendingSection
    );

    setPendingSection(null);
  };

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredSections =
    useMemo(() => {
      const query =
        search
          .toLowerCase()
          .trim();

      if (!query) {
        return SECTIONS;
      }

      return SECTIONS.filter(
        (section) =>
          section.label
            .toLowerCase()
            .includes(query) ||
          section.description
            .toLowerCase()
            .includes(query)
      );
    }, [search]);

  // =========================================================
  // LABEL
  // =========================================================

  const getSectionLabel = (id) => {
    return (
      SECTIONS.find(
        (section) =>
          section.id === id
      )?.label || id
    );
  };

  // =========================================================
  // IMAGE UPLOAD
  // =========================================================

  const uploadHomepageImage = async (
    field,
    file
  ) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(
        'Please select a valid image file.'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        'Image must be smaller than 5 MB.'
      );
      return;
    }

    setError('');
    setMessage(
      'Uploading homepage image...'
    );

    try {
      const extension =
        file.name
          .split('.')
          .pop()
          ?.toLowerCase() ||
        'jpg';

      const filename = `${field}-${Date.now()}.${extension}`;

      const path = `homepage/${filename}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from('homepage-images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from('homepage-images')
        .getPublicUrl(path);

      const publicUrl =
        publicUrlData?.publicUrl;

      if (!publicUrl) {
        throw new Error(
          'Unable to generate the image URL.'
        );
      }

      updateSetting(
        'homepage',
        field,
        publicUrl
      );

      setMessage(
        'Image uploaded successfully. Click Save Changes to apply it.'
      );
    } catch (err) {
      console.error(
        'Homepage image upload error:',
        err
      );

      setError(
        `Image upload failed: ${
          err.message ||
          'Unable to upload image.'
        }`
      );
    }
  };

  // =========================================================
  // IMAGE FIELD
  // =========================================================

  const renderImageField = (
    label,
    field,
    description
  ) => {
    const value =
      settings.homepage[field];

    return (
      <div className="settings-image-field">
        <div className="settings-field">
          <span>{label}</span>

          <div className="settings-input-upload">
            <input
              value={value}
              onChange={(e) =>
                updateSetting(
                  'homepage',
                  field,
                  e.target.value
                )
              }
              placeholder="https://..."
            />

            <label className="settings-upload-button">
              <Upload size={15} />

              Upload

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  uploadHomepageImage(
                    field,
                    e.target.files?.[0]
                  );

                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {description && (
            <small className="settings-help">
              {description}
            </small>
          )}
        </div>

        <div className="settings-image-preview">
          {value ? (
            <>
              <img
                src={value}
                alt={`${label} preview`}
                onError={(e) => {
                  e.currentTarget.style.display =
                    'none';

                  e.currentTarget.parentElement?.classList.add(
                    'image-error'
                  );
                }}
              />

              <div className="image-preview-overlay">
                <ImageIcon size={16} />

                <span>
                  Live Preview
                </span>
              </div>
            </>
          ) : (
            <div className="settings-image-empty">
              <ImageIcon size={28} />

              <span>
                No image selected
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // =========================================================
  // GENERAL
  // =========================================================

  const renderGeneral = () => {
    const data =
      settings.general;

    return (
      <SettingsCard
        title="Business Information"
        description="Configure the information used throughout Sleek Sisters."
        icon={Building2}
      >
        <div className="settings-grid">
          <Field label="Business Name">
            <input
              value={data.business_name}
              onChange={(e) =>
                updateSetting(
                  'general',
                  'business_name',
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Business Tagline">
            <input
              value={
                data.business_tagline
              }
              onChange={(e) =>
                updateSetting(
                  'general',
                  'business_tagline',
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Business Email">
            <input
              type="email"
              value={data.email}
              className={
                data.email &&
                !isValidEmail(
                  data.email
                )
                  ? 'input-invalid'
                  : ''
              }
              onChange={(e) =>
                updateSetting(
                  'general',
                  'email',
                  e.target.value
                )
              }
              placeholder="business@example.com"
            />

            {data.email &&
              !isValidEmail(
                data.email
              ) && (
                <small className="field-error">
                  Enter a valid email address.
                </small>
              )}
          </Field>

          <Field label="Phone">
            <input
              type="tel"
              value={data.phone}
              className={
                data.phone &&
                !isValidKenyanPhone(
                  data.phone
                )
                  ? 'input-invalid'
                  : ''
              }
              onChange={(e) =>
                updateSetting(
                  'general',
                  'phone',
                  e.target.value
                )
              }
              placeholder="0712345678"
            />

            {data.phone &&
              !isValidKenyanPhone(
                data.phone
              ) && (
                <small className="field-error">
                  Example: 0712345678 or
                  +254712345678.
                </small>
              )}
          </Field>

          <Field label="WhatsApp number">
            <input
              type="tel"
              value={data.whatsapp_number || ''}
              onChange={(e) =>
                updateSetting(
                  'general',
                  'whatsapp_number',
                  e.target.value
                )
              }
              placeholder="0712345678"
            />
            <small>
              Used on the shop, product pages and checkout. Can be the same as phone.
            </small>
          </Field>

          <Field label="Pickup note">
            <input
              value={data.pickup_address || ''}
              onChange={(e) =>
                updateSetting(
                  'general',
                  'pickup_address',
                  e.target.value
                )
              }
              placeholder="Nairobi collection point"
            />
          </Field>

          <Field label="Address">
            <input
              value={data.address}
              onChange={(e) =>
                updateSetting(
                  'general',
                  'address',
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="City">
            <input
              value={data.city}
              onChange={(e) =>
                updateSetting(
                  'general',
                  'city',
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Country">
            <input
              value={data.country}
              onChange={(e) =>
                updateSetting(
                  'general',
                  'country',
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Currency">
            <select
              value={data.currency}
              onChange={(e) =>
                updateSetting(
                  'general',
                  'currency',
                  e.target.value
                )
              }
            >
              <option value="KES">
                KES — Kenyan Shilling
              </option>
              <option value="USD">
                USD — US Dollar
              </option>
              <option value="EUR">
                EUR — Euro
              </option>
              <option value="GBP">
                GBP — British Pound
              </option>
            </select>
          </Field>

          <Field label="Timezone">
            <select
              value={data.timezone}
              onChange={(e) =>
                updateSetting(
                  'general',
                  'timezone',
                  e.target.value
                )
              }
            >
              <option value="Africa/Nairobi">
                Africa/Nairobi
              </option>
              <option value="UTC">
                UTC
              </option>
            </select>
          </Field>
        </div>
      </SettingsCard>
    );
  };

  // =========================================================
  // HOMEPAGE
  // =========================================================

  const renderHomepage = () => {
    const data =
      settings.homepage;

    return (
      <SettingsCard
        title="Homepage Content"
        description="Control the content and imagery displayed on the public Sleek Sisters website."
        icon={Home}
      >
        <div className="settings-grid">
          <Field label="Hero Title">
            <input
              value={data.hero_title}
              onChange={(e) =>
                updateSetting(
                  'homepage',
                  'hero_title',
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Hero Subtitle">
            <input
              value={
                data.hero_subtitle
              }
              onChange={(e) =>
                updateSetting(
                  'homepage',
                  'hero_subtitle',
                  e.target.value
                )
              }
            />
          </Field>
        </div>

        <div className="settings-divider" />

        <div className="settings-subsection-heading">
          <div>
            <h4>Homepage Images</h4>

            <p>
              Paste an image URL or upload
              an image directly to Supabase
              Storage.
            </p>
          </div>
        </div>

        <div className="settings-image-grid">
          {renderImageField(
            'Hero Image',
            'hero_image',
            'Main homepage hero image.'
          )}

          {renderImageField(
            'Secondary Image',
            'secondary_image',
            'Secondary promotional image.'
          )}

          {renderImageField(
            'Banner Image',
            'banner_image',
            'Homepage promotional banner.'
          )}
        </div>

        <div className="settings-divider" />

        <div className="settings-options">
          <Toggle
            label="Featured Products"
            description="Display featured products on the homepage."
            checked={
              data.show_featured_products
            }
            onChange={(value) =>
              updateSetting(
                'homepage',
                'show_featured_products',
                value
              )
            }
          />

          <Toggle
            label="Categories"
            description="Display product categories on the homepage."
            checked={
              data.show_categories
            }
            onChange={(value) =>
              updateSetting(
                'homepage',
                'show_categories',
                value
              )
            }
          />

          <Toggle
            label="Services"
            description="Display beauty services on the homepage."
            checked={
              data.show_services
            }
            onChange={(value) =>
              updateSetting(
                'homepage',
                'show_services',
                value
              )
            }
          />
        </div>
      </SettingsCard>
    );
  };

  // =========================================================
  // ORDERS
  // =========================================================

  const renderOrders = () => {
    const data =
      settings.orders;

    return (
      <>
      <SettingsCard
        title="Order Configuration"
        description="Configure order numbering and customer order behavior."
        icon={ShoppingCart}
      >
        <div className="settings-warning">
          <AlertTriangle size={18} />

          <div>
            <strong>
              Order numbering requires backend integration
            </strong>

            <p>
              Your current POS.jsx does not read
              <code>order_prefix</code> or
              <code>next_order_number</code>.
              These values are therefore currently
              stored configuration rather than active
              POS behavior.
            </p>
          </div>
        </div>

        <div className="settings-grid">
          <Field label="Order Prefix">
            <input
              value={data.order_prefix}
              maxLength={10}
              onChange={(e) =>
                updateSetting(
                  'orders',
                  'order_prefix',
                  e.target.value
                )
              }
              placeholder="JB"
            />
          </Field>

          <Field label="Next Order Number">
            <input
              type="number"
              min="1"
              value={
                data.next_order_number
              }
              onChange={(e) =>
                updateSetting(
                  'orders',
                  'next_order_number',
                  Math.max(
                    1,
                    Number(
                      e.target.value
                    ) || 1
                  )
                )
              }
            />
          </Field>

          <Field label="Default Order Status">
            <select
              value={
                data.default_status
              }
              onChange={(e) =>
                updateSetting(
                  'orders',
                  'default_status',
                  e.target.value
                )
              }
            >
              <option value="pending">
                Pending
              </option>

              <option value="processing">
                Processing
              </option>

              <option value="completed">
                Completed
              </option>
            </select>
          </Field>

          <Field label="Cancellation Window">
            <div className="input-with-suffix">
              <input
                type="number"
                min="0"
                max="720"
                value={
                  data.cancellation_hours
                }
                onChange={(e) =>
                  updateSetting(
                    'orders',
                    'cancellation_hours',
                    Math.max(
                      0,
                      Number(
                        e.target.value
                      ) || 0
                    )
                  )
                }
              />

              <span>hours</span>
            </div>
          </Field>
        </div>

        <div className="settings-options">
          <Toggle
            label="Allow Order Cancellation"
            description="Allow eligible orders to be cancelled."
            checked={
              data.allow_order_cancellation
            }
            onChange={(value) =>
              updateSetting(
                'orders',
                'allow_order_cancellation',
                value
              )
            }
          />

          <Toggle
            label="Require Customer Phone"
            description="Require a phone number during checkout."
            checked={
              data.require_customer_phone
            }
            onChange={(value) =>
              updateSetting(
                'orders',
                'require_customer_phone',
                value
              )
            }
          />
        </div>
      </SettingsCard>

      <SettingsCard
          title="Delivery options"
          description="Fees and copy shown on the customer checkout. Pickup is free."
          icon={Truck}
        >
          <div className="settings-delivery-list">
            {deliveryOptions.map((option) => (
              <div key={option.id} className="settings-delivery-row">
                <Field label="Name">
                  <input
                    value={option.name}
                    onChange={(e) =>
                      setDeliveryOptions((current) => {
                        setDirtySections((dirty) => ({
                          ...dirty,
                          orders: true,
                        }));
                        return current.map((row) =>
                          row.id === option.id
                            ? { ...row, name: e.target.value }
                            : row
                        );
                      })
                    }
                  />
                </Field>
                <Field label="Fee (KSh)">
                  <input
                    type="number"
                    min="0"
                    value={option.fee}
                    onChange={(e) =>
                      setDeliveryOptions((current) => {
                        setDirtySections((dirty) => ({
                          ...dirty,
                          orders: true,
                        }));
                        return current.map((row) =>
                          row.id === option.id
                            ? { ...row, fee: Number(e.target.value) || 0 }
                            : row
                        );
                      })
                    }
                  />
                </Field>
                <Field label="Timing">
                  <input
                    value={option.eta || ''}
                    onChange={(e) =>
                      setDeliveryOptions((current) => {
                        setDirtySections((dirty) => ({
                          ...dirty,
                          orders: true,
                        }));
                        return current.map((row) =>
                          row.id === option.id
                            ? { ...row, eta: e.target.value }
                            : row
                        );
                      })
                    }
                  />
                </Field>
                <Field label="Details">
                  <input
                    value={option.description || ''}
                    onChange={(e) =>
                      setDeliveryOptions((current) => {
                        setDirtySections((dirty) => ({
                          ...dirty,
                          orders: true,
                        }));
                        return current.map((row) =>
                          row.id === option.id
                            ? { ...row, description: e.target.value }
                            : row
                        );
                      })
                    }
                  />
                </Field>
                <Toggle
                  label={option.active ? 'Visible' : 'Hidden'}
                  description="Show this option at checkout."
                  checked={Boolean(option.active)}
                  onChange={(value) =>
                    setDeliveryOptions((current) => {
                      setDirtySections((dirty) => ({
                        ...dirty,
                        orders: true,
                      }));
                      return current.map((row) =>
                        row.id === option.id
                          ? { ...row, active: value }
                          : row
                      );
                    })
                  }
                />
              </div>
            ))}
          </div>
        </SettingsCard>
      </>
    );
  };

  // =========================================================
  // PAYMENTS
  // =========================================================

  const updateMpesaProvider = (key, value) => {
    setMpesaProvider((current) => ({
      ...current,
      [key]: value,
    }));
    setDirtySections((current) => ({
      ...current,
      payments: true,
    }));
    setMessage('');
    setError('');
  };

  const handleCopyCallback = async () => {
    try {
      await navigator.clipboard.writeText(MPESA_CALLBACK_URL);
      setMessage('Callback URL copied. Paste it in the Safaricom Daraja app.');
      setError('');
    } catch {
      setError('Could not copy. Select the URL and copy it yourself.');
    }
  };

  const handleTestMpesa = async () => {
    setMpesaBusy(true);
    setError('');
    setMessage('');

    try {
      const { data, error: testError } = await supabase.functions.invoke(
        'mpesa-stk-push',
        {
          body: { action: 'test' },
        }
      );

      if (testError || data?.ok === false || data?.error) {
        let detail = data?.error;
        if (!detail && testError?.context) {
          try {
            const body = await testError.context.json();
            detail = body?.error;
          } catch {
            detail = '';
          }
        }
        throw new Error(
          detail ||
            testError?.message ||
            'Could not connect to Safaricom with the saved keys.'
        );
      }

      const envLabel =
        data?.environment === 'production' ? 'live' : 'sandbox';
      setMessage(
        `Safaricom accepted the keys (${envLabel}). Checkout can send an STK prompt. Orders stay unpaid until the customer enters their PIN.`
      );
    } catch (err) {
      setError(err.message || 'Could not test M-Pesa.');
    } finally {
      setMpesaBusy(false);
    }
  };

  const renderPayments = () => {
    const data =
      settings.payments;

    return (
      <SettingsCard
        title="Payment Methods"
        description="Till and Lipa details for the shop, plus live Safaricom STK when you have Daraja keys."
        icon={CreditCard}
      >
        <div className="payment-methods">
          <PaymentToggle
            title="Cash"
            description="Accept cash payments."
            checked={
              data.cash_enabled
            }
            onChange={(value) =>
              updateSetting(
                'payments',
                'cash_enabled',
                value
              )
            }
          />

          <PaymentToggle
            title="M-Pesa"
            description="Accept M-Pesa payments."
            checked={
              data.mpesa_enabled
            }
            onChange={(value) =>
              updateSetting(
                'payments',
                'mpesa_enabled',
                value
              )
            }
          />

          <PaymentToggle
            title="Card"
            description="Accept card payments."
            checked={
              data.card_enabled
            }
            onChange={(value) =>
              updateSetting(
                'payments',
                'card_enabled',
                value
              )
            }
          />

          <PaymentToggle
            title="Bank Transfer"
            description="Accept bank transfer payments."
            checked={
              data.bank_enabled
            }
            onChange={(value) =>
              updateSetting(
                'payments',
                'bank_enabled',
                value
              )
            }
          />
        </div>

        <div className="settings-grid">
          <Field label="Default Payment Method">
            <select
              value={
                data.default_method
              }
              onChange={(e) =>
                updateSetting(
                  'payments',
                  'default_method',
                  e.target.value
                )
              }
            >
              <option value="cash">
                Cash
              </option>

              <option value="mpesa">
                M-Pesa
              </option>

              <option value="card">
                Card
              </option>

              <option value="bank">
                Bank Transfer
              </option>
            </select>
          </Field>
        </div>

        <div className="settings-options">
          <Toggle
            label="Require Transaction ID"
            description="Require a transaction/reference number where applicable."
            checked={
              data.require_transaction_id
            }
            onChange={(value) =>
              updateSetting(
                'payments',
                'require_transaction_id',
                value
              )
            }
          />
        </div>

        <div className="settings-grid">
          <Field label="M-Pesa till">
            <input
              value={data.mpesa_till || ''}
              onChange={(e) =>
                updateSetting('payments', 'mpesa_till', e.target.value)
              }
              placeholder="Buy Goods till customers can pay to"
            />
          </Field>
          <Field label="M-Pesa paybill">
            <input
              value={data.mpesa_paybill || ''}
              onChange={(e) =>
                updateSetting('payments', 'mpesa_paybill', e.target.value)
              }
              placeholder="Optional if you use paybill instead"
            />
          </Field>
          <Field label="Account name">
            <input
              value={data.mpesa_account_name || ''}
              onChange={(e) =>
                updateSetting(
                  'payments',
                  'mpesa_account_name',
                  e.target.value
                )
              }
              placeholder="Sleek Sisters"
            />
          </Field>
        </div>

        <p className="settings-help">
          Till or paybill is what shoppers see for Lipa Na M-Pesa if the phone
          prompt does not arrive. Save this even before Daraja is connected.
        </p>

        <h3 className="settings-subsection">Live STK (Daraja)</h3>
        <ol className="settings-email-steps">
          <li>
            Create or open your app on{' '}
            <a
              href="https://developer.safaricom.co.ke/"
              target="_blank"
              rel="noreferrer"
            >
              developer.safaricom.co.ke
            </a>
            . Use <strong>Production</strong> for real customer payments, not
            sandbox.
          </li>
          <li>
            Paste the callback URL below into the app, then copy the consumer
            key, consumer secret, Lipa Na M-Pesa passkey, and the till or
            paybill shortcode into this page. Do not send those secrets in
            chat.
          </li>
          <li>
            Click Save Changes, then Test Safaricom connection. Checkout will
            send a phone prompt. The order stays unpaid until Safaricom
            confirms the PIN.
          </li>
        </ol>

        <a
          className="settings-staff-link"
          href="https://developer.safaricom.co.ke/"
          target="_blank"
          rel="noreferrer"
        >
          Open Safaricom Daraja
          <ExternalLink size={16} />
        </a>

        <Field label="Daraja callback URL">
          <div className="settings-callback-row">
            <input readOnly value={MPESA_CALLBACK_URL} />
            <button
              type="button"
              className="settings-staff-link"
              onClick={handleCopyCallback}
            >
              <Copy size={16} />
              Copy
            </button>
          </div>
        </Field>

        <div className="settings-grid">
          <Field label="STK shortcode">
            <input
              value={mpesaProvider.shortcode}
              onChange={(e) =>
                updateMpesaProvider('shortcode', e.target.value)
              }
              placeholder="Same as till, unless Safaricom gave a different code"
            />
          </Field>
          <Field label="STK type">
            <select
              value={mpesaProvider.party_type}
              onChange={(e) =>
                updateMpesaProvider('party_type', e.target.value)
              }
            >
              <option value="till">Buy Goods till</option>
              <option value="paybill">Paybill</option>
            </select>
          </Field>
          <Field label="Daraja environment">
            <select
              value={mpesaProvider.environment}
              onChange={(e) =>
                updateMpesaProvider('environment', e.target.value)
              }
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </Field>
          <Field label="Consumer key">
            <input
              value={mpesaProvider.consumer_key}
              onChange={(e) =>
                updateMpesaProvider('consumer_key', e.target.value)
              }
              placeholder={
                mpesaProvider.configured
                  ? 'Saved — paste to replace'
                  : 'Safaricom consumer key'
              }
            />
          </Field>
          <Field label="Consumer secret">
            <input
              type="password"
              value={mpesaProvider.consumer_secret}
              onChange={(e) =>
                updateMpesaProvider('consumer_secret', e.target.value)
              }
              placeholder={
                mpesaProvider.configured
                  ? 'Saved — leave blank to keep'
                  : 'Safaricom consumer secret'
              }
            />
          </Field>
          <Field label="Passkey">
            <input
              type="password"
              value={mpesaProvider.passkey}
              onChange={(e) =>
                updateMpesaProvider('passkey', e.target.value)
              }
              placeholder={
                mpesaProvider.configured
                  ? 'Saved — leave blank to keep'
                  : 'STK passkey'
              }
            />
          </Field>
        </div>

        <p className="settings-help">
          {mpesaProvider.configured
            ? 'Daraja credentials are saved. Test the connection, then place a real checkout. We will not mark an order paid until Safaricom says so.'
            : 'Without these keys, customers still place unpaid orders and see Lipa Na M-Pesa instructions. Save Production keys here when Safaricom gives you the API.'}
        </p>

        <button
          type="button"
          className="settings-staff-link"
          onClick={handleTestMpesa}
          disabled={mpesaBusy || Boolean(dirtySections.payments)}
        >
          {mpesaBusy
            ? 'Testing…'
            : dirtySections.payments
              ? 'Save Changes before testing'
              : 'Test Safaricom connection'}
        </button>
      </SettingsCard>
    );
  };

  // =========================================================
  // INVENTORY
  // =========================================================

  const renderInventory = () => {
    const data =
      settings.inventory;

    return (
      <SettingsCard
        title="Inventory Management"
        description="Control how product stock is tracked."
        icon={Package}
      >
        <div className="settings-grid">
          <Field label="Low Stock Threshold">
            <input
              type="number"
              min="0"
              max="100000"
              value={
                data.low_stock_threshold
              }
              onChange={(e) =>
                updateSetting(
                  'inventory',
                  'low_stock_threshold',
                  Math.max(
                    0,
                    Number(
                      e.target.value
                    ) || 0
                  )
                )
              }
            />

            <small className="settings-help">
              Products at or below this
              quantity can be flagged as
              low stock.
            </small>
          </Field>
        </div>

        <div className="settings-options">
          <Toggle
            label="Allow Negative Stock"
            description="Allow sales to continue when stock reaches zero."
            checked={
              data.allow_negative_stock
            }
            onChange={(value) =>
              updateSetting(
                'inventory',
                'allow_negative_stock',
                value
              )
            }
          />

          <Toggle
            label="Automatic Stock Updates"
            description="Automatically reduce stock when a sale is completed."
            checked={
              data.auto_update_stock
            }
            onChange={(value) =>
              updateSetting(
                'inventory',
                'auto_update_stock',
                value
              )
            }
          />

          <Toggle
            label="Track Inventory Movements"
            description="Record stock additions, sales and adjustments."
            checked={
              data.track_inventory_movements
            }
            onChange={(value) =>
              updateSetting(
                'inventory',
                'track_inventory_movements',
                value
              )
            }
          />
        </div>
      </SettingsCard>
    );
  };

  // =========================================================
  // STAFF
  // =========================================================

  const renderStaff = () => {
    return (
      <SettingsCard
        title="Staff & Permissions"
        description="Staff accounts and permissions are managed from the dedicated Staff administration area."
        icon={Users}
      >
        <div className="settings-staff-panel">
          <div className="settings-staff-icon">
            <Users size={28} />
          </div>

          <div className="settings-staff-content">
            <h4>
              Manage staff separately
            </h4>

            <p>
              Create staff accounts, assign
              roles, manage access and control
              account status from the Staff
              administration page.
            </p>

            <Link
              to="/staff"
              className="settings-staff-link"
            >
              Open Staff Management
              <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      </SettingsCard>
    );
    };

  const renderSms = () => {
    const data = settings.sms;

    const handleTestSms = async () => {
      setSmsBusy(true);
      setError('');
      setMessage('');

      try {
        const { data: result, error: smsError } = await dispatchSms(
          supabase,
          { action: 'test', phone: smsTestPhone }
        );

        if (smsError) {
          throw smsError;
        }

        if (result?.error) {
          throw new Error(result.error);
        }

        setMessage(
          result?.warning ||
            `SMS processed. Sent ${result?.sent || 0}, queued ${result?.queued || 0}.`
        );
      } catch (err) {
        setError(err.message || 'Could not send a test SMS.');
      } finally {
        setSmsBusy(false);
      }
    };

    return (
      <SettingsCard
        title="Customer SMS"
        description="Thank customers after payment, and alert them by SMS and Sleek Sisters email when a new product is added."
        icon={Smartphone}
      >
        <div className="settings-options">
          <Toggle
            label="Thank-you SMS after payment"
            description="Send an appreciation text once an order is marked paid."
            checked={Boolean(data.payment_thanks_enabled)}
            onChange={(value) =>
              updateSetting('sms', 'payment_thanks_enabled', value)
            }
          />

          <Toggle
            label="New product alerts"
            description="Bulk-text and email opted-in customers with a link to the new product."
            checked={Boolean(data.new_product_alerts_enabled)}
            onChange={(value) =>
              updateSetting('sms', 'new_product_alerts_enabled', value)
            }
          />
        </div>

        <div className="settings-grid">
          <Field label="Shop URL used in SMS links">
            <input
              value={data.store_public_url || ''}
              onChange={(e) =>
                updateSetting('sms', 'store_public_url', e.target.value)
              }
              placeholder="https://your-shop.example"
            />
          </Field>

          <Field label="Africa's Talking username">
            <input
              value={smsProvider.username}
              onChange={(e) => {
                setSmsProvider((current) => ({
                  ...current,
                  username: e.target.value,
                }));
                setDirtySections((current) => ({
                  ...current,
                  sms: true,
                }));
              }}
              placeholder="sandbox or live username"
            />
          </Field>

          <Field label="Sender ID">
            <input
              value={smsProvider.sender_id}
              onChange={(e) => {
                setSmsProvider((current) => ({
                  ...current,
                  sender_id: e.target.value,
                }));
                setDirtySections((current) => ({
                  ...current,
                  sms: true,
                }));
              }}
              placeholder="SLEEKSISTERS"
            />
          </Field>

          <Field label="API key">
            <input
              type="password"
              value={smsProvider.api_key}
              onChange={(e) => {
                setSmsProvider((current) => ({
                  ...current,
                  api_key: e.target.value,
                }));
                setDirtySections((current) => ({
                  ...current,
                  sms: true,
                }));
              }}
              placeholder={
                smsProvider.configured
                  ? 'Saved — leave blank to keep the current key'
                  : 'Paste API key'
              }
            />
          </Field>
        </div>

        <p className="settings-help">
          {smsProvider.configured
            ? 'A provider key is saved. Messages stay queued until this key can reach Africa\'s Talking.'
            : 'Save your Africa\'s Talking details, then send a test. Without a key, messages are queued and sent later.'}
        </p>

        <div className="settings-grid">
          <Field label="Send a test SMS">
            <input
              value={smsTestPhone}
              onChange={(e) => setSmsTestPhone(e.target.value)}
              placeholder="0712 345 678"
            />
          </Field>
        </div>

        <button
          type="button"
          className="settings-staff-link"
          onClick={handleTestSms}
          disabled={smsBusy || !smsTestPhone.trim()}
        >
          {smsBusy ? 'Sending…' : 'Send test SMS'}
        </button>
      </SettingsCard>
    );
  };

  const updateEmailProvider = (key, value) => {
    setEmailProvider((current) => ({
      ...current,
      [key]: value,
    }));
    setDirtySections((current) => ({
      ...current,
      email: true,
    }));
    setMessage('');
    setError('');
  };

  const handleTestEmail = async () => {
    setEmailBusy(true);
    setError('');
    setMessage('');

    try {
      const { data, error: testError } = await supabase.functions.invoke(
        'invite-staff',
        {
          body: {
            action: 'test',
            email: emailTestTo.trim(),
          },
        }
      );

      if (testError || data?.error) {
        let detail = data?.error;
        if (!detail && testError?.context) {
          try {
            const body = await testError.context.json();
            detail = body?.error;
          } catch {
            detail = '';
          }
        }
        throw new Error(detail || testError?.message || 'Could not send a test email.');
      }

      setMessage('Test email sent from the Sleek Sisters account.');
    } catch (err) {
      setError(err.message || 'Could not send a test email.');
    } finally {
      setEmailBusy(false);
    }
  };

  const handleTestProductEmail = async () => {
    setEmailBusy(true);
    setError('');
    setMessage('');

    try {
      const { data, error: testError } = await dispatchEmail(supabase, {
        action: 'test',
        email: emailTestTo.trim(),
      });

      if (testError || data?.error) {
        let detail = data?.error;
        if (!detail && testError?.context) {
          try {
            const body = await testError.context.json();
            detail = body?.error;
          } catch {
            detail = '';
          }
        }
        throw new Error(
          detail || testError?.message || 'Could not send a sample product email.'
        );
      }

      setMessage(
        'Sample new-product email sent from Sleek Sisters. Customers on the email list get this when you add a product.'
      );
    } catch (err) {
      setError(err.message || 'Could not send a sample product email.');
    } finally {
      setEmailBusy(false);
    }
  };

  const renderEmail = () => {
    return (
      <SettingsCard
        title="Sleek Sisters email"
        description="Staff PIN emails and new-product emails leave from this mailbox. Supabase is not used to send them."
        icon={Mail}
      >
        <ol className="settings-email-steps">
          <li>
            Use the Gmail or Google Workspace address you actually own.
            If <code>hello@sleeksisters.com</code> is not a real mailbox yet,
            put your working Gmail in From email and Username.
          </li>
          <li>
            On that Google account, turn on 2-Step Verification, then create
            an App Password named <strong>Sleek Sisters Admin</strong>.
          </li>
          <li>
            Paste the 16-character app password below, click Save Changes,
            then send a test email to yourself.
          </li>
        </ol>

        <a
          className="settings-staff-link"
          href="https://myaccount.google.com/apppasswords"
          target="_blank"
          rel="noreferrer"
        >
          Open Google App Passwords
          <ExternalLink size={16} />
        </a>

        <div className="settings-grid">
          <Field label="From name">
            <input
              value={emailProvider.from_name}
              onChange={(e) => updateEmailProvider('from_name', e.target.value)}
              placeholder="Sleek Sisters"
            />
          </Field>
          <Field label="From email">
            <input
              type="email"
              value={emailProvider.from_email}
              onChange={(e) =>
                updateEmailProvider('from_email', e.target.value)
              }
              placeholder="your-gmail@gmail.com"
            />
          </Field>
          <Field label="SMTP host">
            <input
              value={emailProvider.smtp_host}
              onChange={(e) => updateEmailProvider('smtp_host', e.target.value)}
              placeholder="smtp.gmail.com"
            />
          </Field>
          <Field label="SMTP port">
            <input
              type="number"
              value={emailProvider.smtp_port}
              onChange={(e) =>
                updateEmailProvider('smtp_port', Number(e.target.value || 465))
              }
            />
          </Field>
          <Field label="Mailbox username">
            <input
              value={emailProvider.username}
              onChange={(e) => updateEmailProvider('username', e.target.value)}
              placeholder="Same as the Gmail address"
            />
          </Field>
          <Field label="Gmail app password">
            <input
              type="password"
              value={emailProvider.password}
              onChange={(e) => updateEmailProvider('password', e.target.value)}
              placeholder={
                emailProvider.configured
                  ? 'Saved — leave blank to keep the current password'
                  : 'xxxx xxxx xxxx xxxx'
              }
            />
          </Field>
          <Field label="Admin login URL">
            <input
              value={emailProvider.admin_login_url}
              onChange={(e) =>
                updateEmailProvider('admin_login_url', e.target.value)
              }
              placeholder="http://localhost:5176"
            />
          </Field>
        </div>

        <p className="settings-help">
          {emailProvider.configured
            ? 'A mailbox password is saved. Send a test below to confirm mail leaves from Sleek Sisters, not Supabase.'
            : 'Gmail will not accept your normal login password here. Use an App Password. Host smtp.gmail.com, port 465.'}
        </p>

        <div className="settings-grid">
          <Field label="Send a test email to">
            <input
              type="email"
              value={emailTestTo}
              onChange={(e) => setEmailTestTo(e.target.value)}
              placeholder="your inbox"
            />
          </Field>
        </div>

        <button
          type="button"
          className="settings-staff-link"
          onClick={handleTestEmail}
          disabled={emailBusy || !emailTestTo.trim()}
        >
          {emailBusy ? 'Sending…' : 'Send test email'}
        </button>

        <button
          type="button"
          className="settings-staff-link"
          onClick={handleTestProductEmail}
          disabled={emailBusy || !emailTestTo.trim()}
        >
          {emailBusy ? 'Sending…' : 'Send sample new-product email'}
        </button>
      </SettingsCard>
    );
  };

  const renderNotifications =
    () => {
      const data =
        settings.notifications;

      return (
        <SettingsCard
          title="Notifications"
          description="Choose which system events generate notifications."
          icon={Bell}
        >
          <div className="settings-options">
            <Toggle
              label="Order Notifications"
              description="Notify staff about important order events."
              checked={
                data.order_notifications
              }
              onChange={(value) =>
                updateSetting(
                  'notifications',
                  'order_notifications',
                  value
                )
              }
            />

            <Toggle
              label="Payment Notifications"
              description="Notify staff when payments are completed."
              checked={
                data.payment_notifications
              }
              onChange={(value) =>
                updateSetting(
                  'notifications',
                  'payment_notifications',
                  value
                )
              }
            />

            <Toggle
              label="Low Stock Notifications"
              description="Notify staff when products reach the low-stock threshold."
              checked={
                data.low_stock_notifications
              }
              onChange={(value) =>
                updateSetting(
                  'notifications',
                  'low_stock_notifications',
                  value
                )
              }
            />

            <Toggle
              label="Staff Notifications"
              description="Enable important administrative notifications."
              checked={
                data.staff_notifications
              }
              onChange={(value) =>
                updateSetting(
                  'notifications',
                  'staff_notifications',
                  value
                )
              }
            />
          </div>
        </SettingsCard>
      );
    };

  // =========================================================
  // SECURITY
  // =========================================================

  const renderSecurity = () => {
    const data =
      settings.security;

    return (
      <SettingsCard
        title="Security Preferences"
        description="Configure administrative security behavior."
        icon={ShieldCheck}
      >
        <div className="settings-grid">
          <Field label="Session Timeout">
            <div className="input-with-suffix">
              <input
                type="number"
                min="5"
                max="1440"
                value={
                  data.session_timeout
                }
                onChange={(e) =>
                  updateSetting(
                    'security',
                    'session_timeout',
                    Math.min(
                      1440,
                      Math.max(
                        5,
                        Number(
                          e.target.value
                        ) || 5
                      )
                    )
                  )
                }
              />

              <span>minutes</span>
            </div>

            <small className="settings-help">
              Allowed range: 5 minutes to
              24 hours.
            </small>
          </Field>
        </div>

        <div className="settings-options">
          <Toggle
            label="Require Strong Passwords"
            description="Require stronger passwords for staff accounts."
            checked={
              data.require_strong_password
            }
            onChange={(value) =>
              updateSetting(
                'security',
                'require_strong_password',
                value
              )
            }
          />

          <Toggle
            label="Allow Multiple Sessions"
            description="Allow an account to remain signed in on multiple devices."
            checked={
              data.allow_multiple_sessions
            }
            onChange={(value) =>
              updateSetting(
                'security',
                'allow_multiple_sessions',
                value
              )
            }
          />
        </div>
      </SettingsCard>
    );
  };

  // =========================================================
  // ACTIVE SECTION
  // =========================================================

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneral();

      case 'homepage':
        return renderHomepage();

      case 'orders':
        return renderOrders();

      case 'payments':
        return renderPayments();

      case 'inventory':
        return renderInventory();

      case 'staff':
        return renderStaff();

      case 'notifications':
        return renderNotifications();

      case 'sms':
        return renderSms();

      case 'email':
        return renderEmail();

      case 'security':
        return renderSecurity();

      default:
        return renderGeneral();
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          <RefreshCw
            size={30}
            className="is-spinning"
          />

          <h2>
            Loading settings
          </h2>

          <p>
            Preparing your Sleek Sisters
            configuration...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-title-row">
          <div className="settings-title-icon">
            <ShieldCheck size={23} />
          </div>

          <div>
            <span className="settings-eyebrow">
              SYSTEM ADMINISTRATION
            </span>

            <h1>Settings</h1>

            <p>
              Manage your Sleek Sisters
              system configuration.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="settings-refresh-button"
          onClick={loadSettings}
          disabled={saving}
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? 'is-spinning'
                : ''
            }
          />

          Refresh
        </button>
      </div>

      {message && (
        <div className="settings-message success">
          <CheckCircle2 size={18} />

          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="settings-message error">
          <AlertCircle size={18} />

          <span>{error}</span>
        </div>
      )}

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-search">
            <Search size={17} />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search settings..."
            />
          </div>

          <nav className="settings-navigation">
            {filteredSections.map(
              (section) => {
                const Icon =
                  section.icon;

                const active =
                  activeSection ===
                  section.id;

                const dirty =
                  dirtySections[
                    section.id
                  ];

                return (
                  <button
                    type="button"
                    key={
                      section.id
                    }
                    className={`settings-nav-item ${
                      active
                        ? 'active'
                        : ''
                    }`}
                    onClick={() =>
                      requestSectionChange(
                        section.id
                      )
                    }
                  >
                    <span className="settings-nav-icon">
                      <Icon size={18} />
                    </span>

                    <span className="settings-nav-text">
                      <strong>
                        {
                          section.label
                        }
                      </strong>

                      <small>
                        {
                          section.description
                        }
                      </small>
                    </span>

                    {dirty && (
                      <span
                        className="unsaved-dot"
                        title="Unsaved changes"
                      />
                    )}
                  </button>
                );
              }
            )}
          </nav>
        </aside>

        <main className="settings-content">
          <div className="settings-content-header">
            <div>
              <span className="settings-breadcrumb">
                Administration / Settings
              </span>

              <h2>
                {
                  getSectionLabel(
                    activeSection
                  )
                }
              </h2>

              {dirtySections[
                activeSection
              ] && (
                <span className="unsaved-label">
                  <span />
                  Unsaved changes
                </span>
              )}
            </div>

            <div className="settings-actions">
              <button
                type="button"
                className="settings-reset-button"
                onClick={requestReset}
                disabled={saving}
              >
                <RotateCcw size={15} />
                Reset
              </button>

              {activeSection !==
                'staff' && (
                <button
                  type="button"
                  className="settings-save-button"
                  onClick={() =>
                    saveCategory(
                      activeSection
                    )
                  }
                  disabled={
                    saving ||
                    !dirtySections[
                      activeSection
                    ]
                  }
                >
                  {saving ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="is-spinning"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {renderActiveSection()}
        </main>
      </div>

      {/* =====================================================
          RESET MODAL
      ===================================================== */}

      {showResetModal && (
        <div
          className="settings-modal-overlay"
          onClick={() =>
            setShowResetModal(false)
          }
        >
          <div
            className="settings-confirm-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              type="button"
              className="settings-modal-close"
              onClick={() =>
                setShowResetModal(false)
              }
            >
              <X size={18} />
            </button>

            <div className="settings-confirm-icon">
              <RotateCcw size={23} />
            </div>

            <h3>
              Reset settings?
            </h3>

            <p>
              This will replace your current
              unsaved changes in the{' '}
              <strong>
                {
                  getSectionLabel(
                    activeSection
                  )
                }
              </strong>{' '}
              section with the default values.
            </p>

            <div className="settings-modal-actions">
              <button
                type="button"
                className="settings-modal-cancel"
                onClick={() =>
                  setShowResetModal(
                    false
                  )
                }
              >
                Keep Changes
              </button>

              <button
                type="button"
                className="settings-modal-danger"
                onClick={
                  resetCategory
                }
              >
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          UNSAVED CHANGES MODAL
      ===================================================== */}

      {pendingSection && (
        <div className="settings-modal-overlay">
          <div className="settings-confirm-modal">
            <div className="settings-confirm-icon warning">
              <AlertTriangle size={23} />
            </div>

            <h3>
              Unsaved changes
            </h3>

            <p>
              You have unsaved changes in{' '}
              <strong>
                {
                  getSectionLabel(
                    activeSection
                  )
                }
              </strong>
              . What would you like to do?
            </p>

            <div className="settings-modal-actions stacked-mobile">
              <button
                type="button"
                className="settings-modal-cancel"
                onClick={() =>
                  setPendingSection(
                    null
                  )
                }
              >
                Stay Here
              </button>

              <button
                type="button"
                className="settings-modal-discard"
                onClick={
                  discardAndSwitch
                }
              >
                Discard Changes
              </button>

              <button
                type="button"
                className="settings-modal-save"
                onClick={
                  saveAndSwitch
                }
                disabled={saving}
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================
// FIELD
// ===========================================================

function Field({
  label,
  children,
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>

      {children}
    </label>
  );
}

// ===========================================================
// TOGGLE
// ===========================================================

function Toggle({
  label,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="settings-toggle-row">
      <div>
        <strong>
          {label}
        </strong>

        <p>
          {description}
        </p>
      </div>

      <button
        type="button"
        className={`settings-switch ${
          checked ? 'on' : ''
        }`}
        onClick={() =>
          onChange(!checked)
        }
        aria-pressed={checked}
      >
        <span />
      </button>
    </div>
  );
}

// ===========================================================
// PAYMENT TOGGLE
// ===========================================================

function PaymentToggle({
  title,
  description,
  checked,
  onChange,
}) {
  return (
    <div
      className={`payment-method ${
        checked ? 'enabled' : ''
      }`}
    >
      <div>
        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>
      </div>

      <button
        type="button"
        className={`settings-switch ${
          checked ? 'on' : ''
        }`}
        onClick={() =>
          onChange(!checked)
        }
        aria-pressed={checked}
      >
        <span />
      </button>
    </div>
  );
}

// ===========================================================
// SETTINGS CARD
// ===========================================================

function SettingsCard({
  title,
  description,
  icon: Icon,
  children,
}) {
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-icon">
          <Icon size={19} />
        </div>

        <div>
          <h3>
            {title}
          </h3>

          <p>
            {description}
          </p>
        </div>
      </div>

      <div className="settings-card-body">
        {children}
      </div>
    </section>
  );
}

export default Settings;