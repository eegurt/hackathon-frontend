
"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  ArcElement,
} from 'chart.js';
import { Search, Filter, FileText, LogIn, LogOut, EyeOff, ChevronDown, Trash2, Save } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const MapView = dynamic(() => import('./components/MapView'), { ssr: false });

const API_BASE = 'https://back.gidroatlas.info';
const AUTH_KEY = 'gidroatlas_auth';

const calculatePriority = (technical_condition, passport_date) => {
  const today = new Date();
  const passport = new Date(passport_date);
  const ageInYears = (today - passport) / (1000 * 60 * 60 * 24 * 365.25);
  return (6 - technical_condition) * 3 + ageInYears;
};

const getPriorityLabel = (score) => {
  if (score >= 12) return 'Высокий';
  if (score >= 6) return 'Средний';
  return 'Низкий';
};

export default function Home() {
  const [userEmail, setUserEmail] = useState('');
  const [userType, setUserType] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [showAuthMenu, setShowAuthMenu] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const [selectedObject, setSelectedObject] = useState(null);
  const [objectForm, setObjectForm] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [priorityForm, setPriorityForm] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [filters, setFilters] = useState({
    region: '',
    resource_type: '',
    water_type: '',
    fauna: '',
    passport_date_from: '',
    passport_date_to: '',
    technical_condition: '',
  });
  const [sortConfig, setSortConfig] = useState({ key: 'priority', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [regions, setRegions] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [waterTypes, setWaterTypes] = useState([]);
  const isExpert = userType === 'expert';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setUserEmail(data.email || '');
        setUserType(data.user_type || '');
        setAccessToken(data.access || '');
        setRefreshToken(data.refresh || '');
        setShowAdminPanel((data.user_type || '') === 'expert');
      } catch (e) {
        console.warn('Failed to parse auth data', e);
      }
    }
  }, []);

  const persistAuth = (payload) => {
    setUserEmail(payload.email || '');
    setUserType(payload.user_type || '');
    setAccessToken(payload.access || '');
    setRefreshToken(payload.refresh || '');
    setShowAdminPanel((payload.user_type || '') === 'expert');
    if (typeof window !== 'undefined') window.localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
  };

  const clearAuth = () => {
    setUserEmail('');
    setUserType('');
    setAccessToken('');
    setRefreshToken('');
    setShowAuthMenu(false);
    if (typeof window !== 'undefined') window.localStorage.removeItem(AUTH_KEY);
  };

  const headersWithAuth = () => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  });

  const handleParallax = (e) => {
    const { currentTarget, clientX, clientY } = e;
    const rect = currentTarget.getBoundingClientRect();
    const x = (clientX - rect.left - rect.width / 2) / rect.width;
    const y = (clientY - rect.top - rect.height / 2) / rect.height;
    setParallax({ x, y });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      region: '',
      resource_type: '',
      water_type: '',
      fauna: '',
      passport_date_from: '',
      passport_date_to: '',
      technical_condition: '',
    });
    setSearchTerm('');
  };

  const regionMap = useMemo(() => Object.fromEntries(regions.map((r) => [r.id, r.name])), [regions]);
  const resourceTypeMap = useMemo(() => Object.fromEntries(resourceTypes.map((r) => [r.id, r.name])), [resourceTypes]);
  const waterTypeMap = useMemo(() => Object.fromEntries(waterTypes.map((w) => [w.id, w.name])), [waterTypes]);

  const mapObjectDetail = useCallback(
    (obj) => {
      const priorityScore =
        obj.priority_score ?? obj.priority ?? calculatePriority(obj.technical_condition || 0, obj.passport_date);
      const priorityLabel =
        obj.priority_level === 'high'
          ? 'Высокий'
          : obj.priority_level === 'medium'
          ? 'Средний'
          : obj.priority_level === 'low'
          ? 'Низкий'
          : getPriorityLabel(priorityScore);

      return {
        id: obj.id,
        name: obj.name,
        regionId: obj.region,
        regionName: regionMap[obj.region] || `Регион ${obj.region ?? ''}`,
        resourceTypeId: obj.resource_type,
        resourceTypeName: resourceTypeMap[obj.resource_type] || `Тип ${obj.resource_type ?? ''}`,
        waterTypeId: obj.water_type,
        waterTypeName: obj.water_type ? waterTypeMap[obj.water_type] || `Тип воды ${obj.water_type}` : '—',
        fauna: Boolean(obj.fauna),
        passport_date: obj.passport_date,
        technical_condition: obj.technical_condition || 0,
        latitude: parseFloat(obj.latitude) || 0,
        longitude: parseFloat(obj.longitude) || 0,
        pdf_url: obj.pdf ?? '#',
        priorityScore,
        priorityLabel,
      };
    },
    [regionMap, resourceTypeMap, waterTypeMap],
  );

  useEffect(() => {
    const loadDictionaries = async () => {
      try {
        const [regionsRes, resourceRes, waterRes] = await Promise.all([
          fetch(`${API_BASE}/atla/regions/`),
          fetch(`${API_BASE}/atla/resource-types/`),
          fetch(`${API_BASE}/atla/water-types/`),
        ]);
        if (!regionsRes.ok || !resourceRes.ok || !waterRes.ok) throw new Error('Не удалось загрузить справочники');
        const [regionsData, resourceData, waterData] = await Promise.all([regionsRes.json(), resourceRes.json(), waterRes.json()]);
        setRegions(regionsData || []);
        setResourceTypes(resourceData || []);
        setWaterTypes(waterData || []);
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить справочники');
      }
    };
    loadDictionaries();
  }, []);

  useEffect(() => {
    const fetchObjects = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (filters.region) params.append('region', filters.region);
        if (filters.resource_type) params.append('resource_type', filters.resource_type);
        if (filters.water_type) params.append('water_type', filters.water_type);
        if (filters.fauna !== '') params.append('fauna', filters.fauna);
        if (filters.passport_date_from) params.append('passport_date_after', filters.passport_date_from);
        if (filters.passport_date_to) params.append('passport_date_before', filters.passport_date_to);
        if (filters.technical_condition) params.append('technical_condition', filters.technical_condition);
        const res = await fetch(`${API_BASE}/atla/objects/${params.toString() ? `?${params}` : ''}`);
        if (!res.ok) throw new Error('Не удалось загрузить объекты');
        const data = await res.json();
        setObjects((data || []).map(mapObjectDetail));
      } catch (err) {
        console.error(err);
        setError(err.message || 'Ошибка загрузки данных');
        setObjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchObjects();
  }, [searchTerm, filters, mapObjectDetail]);

  const filteredAndSortedObjects = useMemo(() => {
    const list = objects.slice();
    if (sortConfig.key) {
      list.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (sortConfig.key === 'priority') {
          aValue = a.priorityScore;
          bValue = b.priorityScore;
        }
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [objects, sortConfig]);

  const stats = useMemo(() => {
    const total = filteredAndSortedObjects.length;
    const withFauna = filteredAndSortedObjects.filter((o) => o.fauna).length;
    const avgCondition = filteredAndSortedObjects.reduce((sum, o) => sum + o.technical_condition, 0) / (total || 1);
    return { total, withFauna, avgCondition: avgCondition.toFixed(1) };
  }, [filteredAndSortedObjects]);

  const regionChartData = useMemo(() => {
    const counts = filteredAndSortedObjects.reduce((acc, obj) => {
      acc[obj.regionName] = (acc[obj.regionName] || 0) + 1;
      return acc;
    }, {});
    const labels = Object.keys(counts);
    return { labels, datasets: [{ label: 'Количество объектов', data: labels.map((l) => counts[l]), backgroundColor: '#0d7dff', borderRadius: 8 }] };
  }, [filteredAndSortedObjects]);

  const waterTypeChartData = useMemo(() => {
    const counts = filteredAndSortedObjects.reduce((acc, obj) => {
      const key = obj.waterTypeName || 'Не указано';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const labels = Object.keys(counts);
    return { labels, datasets: [{ data: labels.map((l) => counts[l]), backgroundColor: ['#0d7dff', '#f97316', '#94a3b8'] }] };
  }, [filteredAndSortedObjects]);

  const priorityChartData = useMemo(() => {
    const counts = { Высокий: 0, Средний: 0, Низкий: 0 };
    filteredAndSortedObjects.forEach((obj) => {
      counts[obj.priorityLabel] = (counts[obj.priorityLabel] || 0) + 1;
    });
    return { labels: ['Высокий', 'Средний', 'Низкий'], datasets: [{ label: 'Приоритет обследования', data: [counts['Высокий'], counts['Средний'], counts['Низкий']], backgroundColor: ['#ef4444', '#eab308', '#22c55e'], borderRadius: 8 }] };
  }, [filteredAndSortedObjects]);

  const handleSelectObject = async (obj) => {
    if (!obj?.id) return;
    setSelectedObject(obj);
    setObjectForm({ ...obj, fauna: obj.fauna ? 'true' : 'false' });
    setSelectedPriority(null);
    setPriorityForm(null);
    setDetailLoading(true);
    setSaveMessage('');
    try {
      const [detailRes, priorityRes] = await Promise.all([
        fetch(`${API_BASE}/atla/objects/${obj.id}/`),
        fetch(`${API_BASE}/atla/priority-scores/${obj.id}/by-object/`),
      ]);
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const mapped = mapObjectDetail(detail);
        setSelectedObject(mapped);
        setObjectForm({ ...mapped, fauna: mapped.fauna ? 'true' : 'false' });
      }
      if (priorityRes.ok) {
        const pr = await priorityRes.json();
        setSelectedPriority(pr);
        setPriorityForm({ score: pr.score ?? '', level: pr.level ?? 'low', formula_version: pr.formula_version ?? 'v1' });
      }
    } catch (err) {
      console.error('Ошибка загрузки деталей объекта', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleObjectSave = async () => {
    if (!selectedObject?.id || !objectForm) return;
    setSaveMessage('');
    try {
      const body = {
        name: objectForm.name,
        region: Number(objectForm.regionId) || null,
        resource_type: Number(objectForm.resourceTypeId) || null,
        water_type: objectForm.waterTypeId ? Number(objectForm.waterTypeId) : null,
        fauna: objectForm.fauna === 'true',
        passport_date: objectForm.passport_date,
        technical_condition: Number(objectForm.technical_condition) || 0,
        latitude: objectForm.latitude,
        longitude: objectForm.longitude,
        pdf: objectForm.pdf_url === '#' ? null : objectForm.pdf_url,
        priority: selectedObject.priorityScore || 0,
      };
      const res = await fetch(`${API_BASE}/atla/objects/${selectedObject.id}/`, { method: 'PUT', headers: headersWithAuth(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Не удалось сохранить объект');
      const data = await res.json();
      const mapped = mapObjectDetail(data);
      setSelectedObject(mapped);
      setObjectForm({ ...mapped, fauna: mapped.fauna ? 'true' : 'false' });
      setSaveMessage('Объект сохранён');
      setObjects((prev) => prev.map((o) => (o.id === mapped.id ? mapped : o)));
    } catch (err) {
      setSaveMessage(err.message || 'Ошибка сохранения');
    }
  };

  const handleObjectDelete = async () => {
    if (!selectedObject?.id) return;
    if (!confirm('Удалить объект?')) return;
    setSaveMessage('');
    try {
      const res = await fetch(`${API_BASE}/atla/objects/${selectedObject.id}/`, { method: 'DELETE', headers: headersWithAuth() });
      if (!res.ok && res.status !== 204) throw new Error('Не удалось удалить объект');
      setSelectedObject(null);
      setObjectForm(null);
      setSelectedPriority(null);
      setPriorityForm(null);
      setObjects((prev) => prev.filter((o) => o.id !== selectedObject.id));
      setSaveMessage('Объект удалён');
    } catch (err) {
      setSaveMessage(err.message || 'Ошибка удаления');
    }
  };

  const handlePrioritySave = async () => {
    if (!selectedObject?.id || !priorityForm) return;
    setSaveMessage('');
    try {
      const body = { score: Number(priorityForm.score) || 0, level: priorityForm.level || 'low', formula_version: priorityForm.formula_version || 'v1' };
      const res = await fetch(`${API_BASE}/atla/priority-scores/${selectedObject.id}/by-object/`, { method: 'PUT', headers: headersWithAuth(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Не удалось сохранить приоритет');
      const pr = await res.json();
      setSelectedPriority(pr);
      setPriorityForm({ score: pr.score ?? '', level: pr.level ?? 'low', formula_version: pr.formula_version ?? 'v1' });
      setSaveMessage('Приоритет сохранён');
      setSelectedObject((prev) => (prev ? { ...prev, priorityScore: pr.score, priorityLabel: getPriorityLabel(pr.score) } : prev));
      setObjects((prev) => prev.map((o) => (o.id === selectedObject.id ? { ...o, priorityScore: pr.score, priorityLabel: getPriorityLabel(pr.score) } : o)));
    } catch (err) {
      setSaveMessage(err.message || 'Ошибка сохранения приоритета');
    }
  };

  const handlePriorityDelete = async () => {
    if (!selectedObject?.id) return;
    if (!confirm('Удалить запись приоритета?')) return;
    setSaveMessage('');
    try {
      const res = await fetch(`${API_BASE}/atla/priority-scores/${selectedObject.id}/by-object/`, { method: 'DELETE', headers: headersWithAuth() });
      if (!res.ok && res.status !== 204) throw new Error('Не удалось удалить приоритет');
      setSelectedPriority(null);
      setPriorityForm(null);
      setSaveMessage('Приоритет удалён');
    } catch (err) {
      setSaveMessage(err.message || 'Ошибка удаления приоритета');
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/user/login/' : '/user/register/';
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: login, password }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Ошибка запроса');
      }
      const data = await res.json();
      if (authMode === 'login') {
        persistAuth(data);
        setShowLogin(false);
        setShowAuthMenu(false);
      } else {
        setRegisterSuccess(true);
        setAuthMode('login');
      }
      setLogin('');
      setPassword('');
    } catch (err) {
      setAuthError(err.message || 'Ошибка авторизации');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" onMouseMove={handleParallax}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-32 w-96 h-96 rounded-full blur-3xl opacity-40"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(13,125,255,0.25), transparent 60%), radial-gradient(circle at 70% 60%, rgba(16,185,129,0.25), transparent 60%)',
            transform: `translate3d(${parallax.x * 40}px, ${parallax.y * 30}px, 0)`,
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-35"
          style={{
            background:
              'radial-gradient(circle at 40% 40%, rgba(14,165,233,0.24), transparent 65%), radial-gradient(circle at 70% 70%, rgba(234,179,8,0.18), transparent 60%)',
            transform: `translate3d(${parallax.x * 30}px, ${parallax.y * 40}px, 0)`,
          }}
        />
        <div
          className="absolute inset-0 tech-grid opacity-50"
          style={{
            transform: `translate3d(${parallax.x * 20}px, ${parallax.y * 20}px, 0)`,
          }}
        />
      </div>

      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">GidroAtlas</h1>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Поиск по названию..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {isExpert && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Фильтры</span>
              </button>
            )}

            {userEmail ? (
              <div className="relative">
                <button
                  onClick={() => setShowAuthMenu((v) => !v)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <span>{userEmail}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showAuthMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[1000]">
                    <div className="px-4 py-2 text-sm text-gray-700">Роль: {userType || '—'}</div>
                    <a
                      href="https://back.gidroatlas.info/admin/"
                      target="_blank"
                      rel="noreferrer"
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 border-t border-gray-100 ${
                        userType === 'expert' ? 'hover:bg-primary-50 text-primary-700' : 'text-gray-400 cursor-not-allowed bg-gray-50 pointer-events-none'
                      }`}
                    >
                      Панель управления
                    </a>
                    <button
                      onClick={clearAuth}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Выйти
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowLogin(true);
                  setAuthMode('login');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Вход</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {showFilters && isExpert && (
        <div className="bg-white border-b shadow-sm p-4">
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <select name="region" value={filters.region} onChange={handleFilterChange} className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Все области</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
            <select name="resource_type" value={filters.resource_type} onChange={handleFilterChange} className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Все типы</option>
              {resourceTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <select name="water_type" value={filters.water_type} onChange={handleFilterChange} className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Тип воды</option>
              {waterTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <select name="fauna" value={filters.fauna} onChange={handleFilterChange} className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Фауна</option>
              <option value="true">Да</option>
              <option value="false">Нет</option>
            </select>
            <div className="flex gap-2">
              <input type="date" name="passport_date_from" value={filters.passport_date_from} onChange={handleFilterChange} className="border border-gray-300 rounded-lg px-3 py-2 flex-1" />
              <input type="date" name="passport_date_to" value={filters.passport_date_to} onChange={handleFilterChange} className="border border-gray-300 rounded-lg px-3 py-2 flex-1" />
            </div>
            <select name="technical_condition" value={filters.technical_condition} onChange={handleFilterChange} className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Состояние</option>
              {[1, 2, 3, 4, 5].map((cond) => (
                <option key={cond} value={cond}>
                  Категория {cond}
                </option>
              ))}
            </select>
            <button onClick={resetFilters} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors">
              Сбросить
            </button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6 flex flex-col gap-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{error}</div>}

        <section className={isExpert ? "grid grid-cols-1 xl:grid-cols-3 gap-6" : "grid grid-cols-1 gap-6"}>
          <div className={isExpert ? "xl:col-span-2" : ""}>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[520px] relative z-0">
              <div className="absolute top-3 left-3 z-10 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-sm text-gray-700 shadow">
                {loading ? 'Загрузка...' : `${filteredAndSortedObjects.length} объектов на карте`}
              </div>
              <MapView objects={filteredAndSortedObjects} selectedObject={selectedObject} onSelect={handleSelectObject} />
            </div>
            {!isExpert && (
              <div className="mt-4 text-sm text-center text-gray-600">
                Авторизуйтесь как эксперт, чтобы увидеть детали, статистику и управление.
              </div>
            )}
          </div>

          {isExpert && (
            <div className="flex flex-col gap-4">
              <div className="glass-card rounded-xl p-4 relative overflow-hidden" style={{ transform: `translate3d(${parallax.x * 8}px, ${parallax.y * 8}px, 0)`, transition: 'transform 120ms ease-out' }}>
                <div className="absolute inset-0 glass-dots opacity-40" />
                <div className="relative">
                  <h3 className="card-title mb-3">Сводка</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-primary-50 text-primary-900">
                      <div className="text-xs text-primary-700">Всего объектов</div>
                      <div className="text-2xl font-bold">{stats.total}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 text-emerald-900">
                      <div className="text-xs text-emerald-700">Есть фауна</div>
                      <div className="text-2xl font-bold">{stats.withFauna}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 text-amber-900">
                      <div className="text-xs text-amber-700">Среднее состояние</div>
                      <div className="text-2xl font-bold">{stats.avgCondition}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 text-slate-900">
                      <div className="text-xs text-slate-600">Сортировка</div>
                      <button onClick={() => handleSort('priority')} className="text-sm font-semibold text-primary-700 underline">
                        По приоритету ({sortConfig.direction === 'asc' ? '↑' : '↓'})
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {selectedObject ? (
                <div className="glass-card rounded-xl p-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">{selectedObject.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Область:</span>
                      <span className="font-medium text-right">{selectedObject.regionName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Тип ресурса:</span>
                      <span className="font-medium text-right">{selectedObject.resourceTypeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Тип воды:</span>
                      <span className="font-medium text-right">{selectedObject.waterTypeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Фауна:</span>
                      <span className="font-medium text-right">{selectedObject.fauna ? 'Да' : 'Нет'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Дата паспорта:</span>
                      <span className="font-medium text-right">{new Date(selectedObject.passport_date).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Состояние:</span>
                      <span className="font-medium text-right">Категория {selectedObject.technical_condition}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Координаты:</span>
                      <span className="font-medium text-right">
                        {selectedObject.latitude.toFixed(2)}, {selectedObject.longitude.toFixed(2)}
                      </span>
                    </div>
                    <>
                      {selectedObject.pdf_url && selectedObject.pdf_url !== '#' && (
                        <a
                          href={selectedObject.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full mt-3 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Открыть паспорт
                        </a>
                      )}
                      {selectedPriority && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-gray-700 border border-slate-200">
                          <div className="font-semibold text-gray-800 mb-1">Приоритет (детали)</div>
                          <div>Оценка: {selectedPriority.score} ({selectedPriority.level})</div>
                          <div>Формула: {selectedPriority.formula_version}</div>
                          <div>Обновлено: {new Date(selectedPriority.updated_at).toLocaleString('ru-RU')}</div>
                        </div>
                      )}
                      {detailLoading && <div className="text-xs text-gray-500 mt-1">Загрузка деталей...</div>}
                    </>
                  </div>
                </div>
              ) : (
                <div className="glass-card rounded-xl p-4 text-center">
                  <EyeOff className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Выберите объект на карте, чтобы увидеть детали.</p>
                </div>
              )}
            </div>
          )}
        </section>

        {isExpert && (
          <>
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="glass-card rounded-xl p-4 lg:col-span-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="card-title">Приоритеты обследования</h3>
                  <span className="text-xs text-gray-500">Кликайте для деталей</span>
                </div>
                <div className="space-y-3 max-h-[360px] overflow-y-auto scrollbar-hidden">
                  {filteredAndSortedObjects.map((obj) => (
                    <div key={obj.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => handleSelectObject(obj)}>
                      <div className="flex justify-between items-start">
                        <div className="font-medium text-gray-800 text-sm">{obj.name}</div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            obj.priorityScore >= 12 ? 'bg-red-100 text-red-800' : obj.priorityScore >= 6 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {obj.priorityLabel}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {obj.regionName} • Состояние: {obj.technical_condition}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="card-title">Распределение по регионам</h3>
                  <span className="text-xs text-gray-500">Объекты в выборке</span>
                </div>
                <div className="h-64">
                  <Bar
                    data={regionChartData}
                    options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 11 } } }, y: { beginAtZero: true, suggestedMax: 5 } } }}
                  />
                </div>
              </div>

              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="card-title">Тип воды и приоритет</h3>
                  <span className="text-xs text-gray-500">Фильтры учтены</span>
                </div>
                <div className="grid grid-cols-2 gap-4 h-64">
                  <div className="flex flex-col items-center justify-center">
                    <Doughnut data={waterTypeChartData} options={{ plugins: { legend: { position: 'bottom' } }, cutout: '65%' }} />
                    <p className="text-xs text-gray-500 mt-2">Баланс типов воды</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <Bar data={priorityChartData} options={{ indexAxis: 'y', plugins: { legend: { display: false } }, responsive: true, scales: { x: { beginAtZero: true, suggestedMax: 5 } } }} />
                  </div>
                </div>
              </div>
            </section>

            {selectedObject && showAdminPanel && (
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="card-title">Редактировать объект</h3>
                    {!userEmail && <span className="text-xs text-red-500">Нужен вход</span>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-600">Название</span>
                      <input className="border border-gray-300 rounded-lg px-3 py-2" value={objectForm?.name || ''} onChange={(e) => setObjectForm((p) => ({ ...p, name: e.target.value }))} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-600">Регион</span>
                      <select className="border border-gray-300 rounded-lg px-3 py-2" value={objectForm?.regionId || ''} onChange={(e) => setObjectForm((p) => ({ ...p, regionId: e.target.value }))}>
                        <option value="">—</option>
                        {regions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-600">Тип ресурса</span>
                      <select className="border border-gray-300 rounded-lg px-3 py-2" value={objectForm?.resourceTypeId || ''} onChange={(e) => setObjectForm((p) => ({ ...p, resourceTypeId: e.target.value }))}>
                        <option value="">—</option>
                        {resourceTypes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-600">Тип воды</span>
                      <select className="border border-gray-300 rounded-lg px-3 py-2" value={objectForm?.waterTypeId || ''} onChange={(e) => setObjectForm((p) => ({ ...p, waterTypeId: e.target.value }))}>
                        <option value="">—</option>
                        {waterTypes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-600">Фауна</span>
                      <select className="border border-gray-300 rounded-lg px-3 py-2" value={objectForm?.fauna || ''} onChange={(e) => setObjectForm((p) => ({ ...p, fauna: e.target.value }))}>
                        <option value="true">Да</option>
                        <option value="false">Нет</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-600">Дата паспорта</span>
                      <input type="date" className="border border-gray-300 rounded-lg px-3 py-2" value={objectForm?.passport_date || ''} onChange={(e) => setObjectForm((p) => ({ ...p, passport_date: e.target.value }))} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-600">Состояние (1-5)</span>
                      <input type="number" min="1" max="5" className="border border-gray-300 rounded-lg px-3 py-2" value={objectForm?.technical_condition || ''} onChange={(e) => setObjectForm((p) => ({ ...p, technical_condition: e.target.value }))} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-600">Широта</span>
                      <input className="border border-gray-300 rounded-lg px-3 py-2" value={objectForm?.latitude || ''} onChange={(e) => setObjectForm((p) => ({ ...p, latitude: e.target.value }))} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-600">Долгота</span>
                      <input className="border border-gray-300 rounded-lg px-3 py-2" value={objectForm?.longitude || ''} onChange={(e) => setObjectForm((p) => ({ ...p, longitude: e.target.value }))} />
                    </label>
                    <label className="flex flex-col gap-1 md:col-span-2">
                      <span className="text-gray-600">Ссылка на паспорт (PDF)</span>
                      <input className="border border-gray-300 rounded-lg px-3 py-2" value={objectForm?.pdf_url || ''} onChange={(e) => setObjectForm((p) => ({ ...p, pdf_url: e.target.value }))} />
                    </label>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <button onClick={handleObjectSave} disabled={!userEmail} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-60">
                      <Save className="w-4 h-4" /> Сохранить объект
                    </button>
                    <button onClick={handleObjectDelete} disabled={!userEmail} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60">
                      <Trash2 className="w-4 h-4" /> Удалить объект
                    </button>
                  </div>
                </div>

                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="card-title">Приоритет</h3>
                    {!userEmail && <span className="text-xs text-red-500">Нужен вход</span>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-600">Score</span>
                      <input type="number" className="border border-gray-300 rounded-lg px-3 py-2" value={priorityForm?.score ?? ''} onChange={(e) => setPriorityForm((p) => ({ ...(p || {}), score: e.target.value }))} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-600">Level</span>
                      <select className="border border-gray-300 rounded-lg px-3 py-2" value={priorityForm?.level || 'low'} onChange={(e) => setPriorityForm((p) => ({ ...(p || {}), level: e.target.value }))}>
                        <option value="low">Низкий</option>
                        <option value="medium">Средний</option>
                        <option value="high">Высокий</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-gray-600">Формула</span>
                      <input className="border border-gray-300 rounded-lg px-3 py-2" value={priorityForm?.formula_version || 'v1'} onChange={(e) => setPriorityForm((p) => ({ ...(p || {}), formula_version: e.target.value }))} />
                    </label>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <button onClick={handlePrioritySave} disabled={!userEmail} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-60">
                      <Save className="w-4 h-4" /> Сохранить приоритет
                    </button>
                    <button onClick={handlePriorityDelete} disabled={!userEmail} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60">
                      <Trash2 className="w-4 h-4" /> Удалить приоритет
                    </button>
                  </div>
                </div>
              </section>
            )}

            {saveMessage && <div className="bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-lg">{saveMessage}</div>}
          </>
        )}
      </main>

      {showLogin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl relative z-[10000]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">{authMode === 'login' ? 'Вход' : 'Регистрация'}</h2>
              <button onClick={() => setShowLogin(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="flex gap-2 mb-4 text-sm">
              <button
                className={`flex-1 py-2 rounded-lg border ${authMode === 'login' ? 'bg-primary-50 text-primary-700 border-primary-200' : 'border-gray-200 text-gray-700'}`}
                onClick={() => setAuthMode('login')}
              >
                Вход
              </button>
              <button
                className={`flex-1 py-2 rounded-lg border ${authMode === 'register' ? 'bg-primary-50 text-primary-700 border-primary-200' : 'border-gray-200 text-gray-700'}`}
                onClick={() => setAuthMode('register')}
              >
                Регистрация
              </button>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
              {authError && <div className="text-sm text-red-600">{authError}</div>}
              <button type="submit" className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                {authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </button>
              {authMode === 'login' && <p className="text-xs text-gray-500 text-center">Нет аккаунта? Перейдите на вкладку регистрации.</p>}
            </form>
          </div>
        </div>
      )}

      {registerSuccess && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Спасибо за регистрацию!</h3>
            <p className="text-sm text-gray-600 mb-4">Теперь вы можете войти, используя свой email и пароль.</p>
            <button
              onClick={() => {
                setRegisterSuccess(false);
                setShowLogin(true);
                setAuthMode('login');
              }}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Перейти к входу
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
