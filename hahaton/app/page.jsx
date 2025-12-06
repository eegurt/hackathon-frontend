"use client";

import { useMemo, useState } from 'react';
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
import { Search, Filter, FileText, LogIn, LogOut, EyeOff } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const MapView = dynamic(() => import('./components/MapView'), { ssr: false });

const mockObjects = [
  {
    id: 1,
    name: 'Озеро Балхаш',
    region: 'Алматинская область',
    resource_type: 'озеро',
    water_type: 'непресная',
    fauna: true,
    passport_date: '2020-03-15',
    technical_condition: 4,
    latitude: 46.75,
    longitude: 74.98,
    pdf_url: '#',
  },
  {
    id: 2,
    name: 'Канал имени Кирова',
    region: 'Кызылординская область',
    resource_type: 'канал',
    water_type: 'пресная',
    fauna: false,
    passport_date: '2018-07-22',
    technical_condition: 5,
    latitude: 44.5,
    longitude: 65.5,
    pdf_url: '#',
  },
  {
    id: 3,
    name: 'Водохранилище Капчагай',
    region: 'Алматинская область',
    resource_type: 'водохранилище',
    water_type: 'пресная',
    fauna: true,
    passport_date: '2022-01-10',
    technical_condition: 2,
    latitude: 44.15,
    longitude: 77.38,
    pdf_url: '#',
  },
  {
    id: 4,
    name: 'Озеро Зайсан',
    region: 'Восточно-Казахстанская область',
    resource_type: 'озеро',
    water_type: 'пресная',
    fauna: true,
    passport_date: '2019-11-30',
    technical_condition: 3,
    latitude: 46.8,
    longitude: 83.2,
    pdf_url: '#',
  },
  {
    id: 5,
    name: 'Канал Сырдарья',
    region: 'Туркестанская область',
    resource_type: 'канал',
    water_type: 'непресная',
    fauna: false,
    passport_date: '2015-05-18',
    technical_condition: 5,
    latitude: 42.3,
    longitude: 68.8,
    pdf_url: '#',
  },
];

const regions = [
  'Алматинская область',
  'Кызылординская область',
  'Восточно-Казахстанская область',
  'Туркестанская область',
  'Актюбинская область',
  'Карагандинская область',
];

const resourceTypes = ['озеро', 'канал', 'водохранилище'];
const waterTypes = ['пресная', 'непресная'];

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
  const [userRole, setUserRole] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [selectedObject, setSelectedObject] = useState(null);
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

  const handleLogin = (e) => {
    e.preventDefault();
    if (login === 'expert' && password === 'password') {
      setUserRole('expert');
      setShowLogin(false);
      setLogin('');
      setPassword('');
    } else {
      alert('Неверный логин или пароль. Попробуйте: логин=expert, пароль=password');
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setSelectedObject(null);
  };

  const filteredAndSortedObjects = useMemo(() => {
    let filtered = mockObjects.filter((obj) => {
      if (searchTerm && !obj.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filters.region && obj.region !== filters.region) return false;
      if (filters.resource_type && obj.resource_type !== filters.resource_type) return false;
      if (filters.water_type && obj.water_type !== filters.water_type) return false;
      if (filters.fauna !== '' && obj.fauna !== (filters.fauna === 'true')) return false;
      if (filters.passport_date_from) {
        const objDate = new Date(obj.passport_date);
        const fromDate = new Date(filters.passport_date_from);
        if (objDate < fromDate) return false;
      }
      if (filters.passport_date_to) {
        const objDate = new Date(obj.passport_date);
        const toDate = new Date(filters.passport_date_to);
        if (objDate > toDate) return false;
      }
      if (filters.technical_condition && obj.technical_condition !== parseInt(filters.technical_condition)) {
        return false;
      }
      return true;
    });

    filtered = filtered.map((obj) => ({
      ...obj,
      priorityScore: calculatePriority(obj.technical_condition, obj.passport_date),
      priorityLabel: getPriorityLabel(calculatePriority(obj.technical_condition, obj.passport_date)),
    }));

    if (sortConfig.key) {
      filtered.sort((a, b) => {
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

    return filtered;
  }, [searchTerm, filters, sortConfig]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
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

  const handleMapClick = (obj) => {
    setSelectedObject(obj);
  };

  const stats = useMemo(() => {
    const total = filteredAndSortedObjects.length;
    const withFauna = filteredAndSortedObjects.filter((o) => o.fauna).length;
    const avgCondition =
      filteredAndSortedObjects.reduce((sum, o) => sum + o.technical_condition, 0) / (total || 1);
    return {
      total,
      withFauna,
      avgCondition: avgCondition.toFixed(1),
    };
  }, [filteredAndSortedObjects]);

  const handleParallax = (e) => {
    const { currentTarget, clientX, clientY } = e;
    const rect = currentTarget.getBoundingClientRect();
    const x = (clientX - rect.left - rect.width / 2) / rect.width;
    const y = (clientY - rect.top - rect.height / 2) / rect.height;
    setParallax({ x, y });
  };

  const regionChartData = useMemo(() => {
    const counts = filteredAndSortedObjects.reduce((acc, obj) => {
      acc[obj.region] = (acc[obj.region] || 0) + 1;
      return acc;
    }, {});
    const labels = Object.keys(counts);
    return {
      labels,
      datasets: [
        {
          label: 'Количество объектов',
          data: labels.map((label) => counts[label]),
          backgroundColor: '#0d7dff',
          borderRadius: 8,
        },
      ],
    };
  }, [filteredAndSortedObjects]);

  const waterTypeChartData = useMemo(() => {
    const counts = filteredAndSortedObjects.reduce(
      (acc, obj) => {
        acc[obj.water_type] = (acc[obj.water_type] || 0) + 1;
        return acc;
      },
      { пресная: 0, непресная: 0 },
    );
    return {
      labels: ['Пресная', 'Непресная'],
      datasets: [
        {
          data: [counts['пресная'], counts['непресная']],
          backgroundColor: ['#0d7dff', '#f97316'],
        },
      ],
    };
  }, [filteredAndSortedObjects]);

  const priorityChartData = useMemo(() => {
    const counts = { Высокий: 0, Средний: 0, Низкий: 0 };
    filteredAndSortedObjects.forEach((obj) => {
      counts[obj.priorityLabel] += 1;
    });
    return {
      labels: ['Высокий', 'Средний', 'Низкий'],
      datasets: [
        {
          label: 'Приоритет обследования',
          data: [counts['Высокий'], counts['Средний'], counts['Низкий']],
          backgroundColor: ['#ef4444', '#eab308', '#22c55e'],
          borderRadius: 8,
        },
      ],
    };
  }, [filteredAndSortedObjects]);

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

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Фильтры</span>
            </button>

            {userRole === 'expert' ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Выход</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Вход</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {showFilters && (
        <div className="bg-white border-b shadow-sm p-4">
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <select
              name="region"
              value={filters.region}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Все области</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>

            <select
              name="resource_type"
              value={filters.resource_type}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Все типы</option>
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              name="water_type"
              value={filters.water_type}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Тип воды</option>
              {waterTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              name="fauna"
              value={filters.fauna}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Фауна</option>
              <option value="true">Да</option>
              <option value="false">Нет</option>
            </select>

            <div className="flex gap-2">
              <input
                type="date"
                name="passport_date_from"
                value={filters.passport_date_from}
                onChange={handleFilterChange}
                className="border border-gray-300 rounded-lg px-3 py-2 flex-1"
                placeholder="От"
              />
              <input
                type="date"
                name="passport_date_to"
                value={filters.passport_date_to}
                onChange={handleFilterChange}
                className="border border-gray-300 rounded-lg px-3 py-2 flex-1"
                placeholder="До"
              />
            </div>

            <select
              name="technical_condition"
              value={filters.technical_condition}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Состояние</option>
              {[1, 2, 3, 4, 5].map((cond) => (
                <option key={cond} value={cond}>
                  Категория {cond}
                </option>
              ))}
            </select>

            <button
              onClick={resetFilters}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
            >
              Сбросить
            </button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6 flex flex-col gap-6">
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[520px] relative">
              <div className="absolute top-3 left-3 z-10 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-sm text-gray-700 shadow">
                {filteredAndSortedObjects.length} объектов на карте
              </div>
              <MapView
                objects={filteredAndSortedObjects}
                selectedObject={selectedObject}
                onSelect={handleMapClick}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div
              className="glass-card rounded-xl p-4 relative overflow-hidden"
              style={{
                transform: `translate3d(${parallax.x * 8}px, ${parallax.y * 8}px, 0)` ,
                transition: 'transform 120ms ease-out',
              }}
            >
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
                    <button
                      onClick={() => handleSort('priority')}
                      className="text-sm font-semibold text-primary-700 underline"
                    >
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
                    <span className="font-medium text-right">{selectedObject.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Тип ресурса:</span>
                    <span className="font-medium text-right">{selectedObject.resource_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Тип воды:</span>
                    <span className="font-medium text-right">{selectedObject.water_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Фауна:</span>
                    <span className="font-medium text-right">{selectedObject.fauna ? 'Да' : 'Нет'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Дата паспорта:</span>
                    <span className="font-medium text-right">
                      {new Date(selectedObject.passport_date).toLocaleDateString('ru-RU')}
                    </span>
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
                  {userRole === 'expert' && (
                    <button className="w-full mt-3 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" />
                      Открыть паспорт
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-xl p-4 text-center">
                <EyeOff className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Выберите объект на карте, чтобы увидеть детали.</p>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-xl p-4 lg:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="card-title">Приоритеты обследования</h3>
              {userRole !== 'expert' && <span className="text-xs text-gray-500">Только для экспертов</span>}
            </div>
            {userRole === 'expert' ? (
              <div className="space-y-3 max-h-[360px] overflow-y-auto scrollbar-hidden">
                {filteredAndSortedObjects.map((obj) => (
                  <div
                    key={obj.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedObject(obj)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-gray-800 text-sm">{obj.name}</div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          obj.priorityScore >= 12
                            ? 'bg-red-100 text-red-800'
                            : obj.priorityScore >= 6
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {obj.priorityLabel}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {obj.region} • Состояние: {obj.technical_condition}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                Авторизуйтесь как эксперт, чтобы видеть приоритеты обследования и открывать паспорта объектов.
              </div>
            )}
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="card-title">Распределение по регионам</h3>
              <span className="text-xs text-gray-500">Объекты в выборке</span>
            </div>
            <div className="h-64">
              <Bar
                data={regionChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    x: { ticks: { font: { size: 11 } } },
                    y: { beginAtZero: true, suggestedMax: 5 },
                  },
                }}
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
                <Doughnut
                  data={waterTypeChartData}
                  options={{
                    plugins: { legend: { position: 'bottom' } },
                    cutout: '65%',
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">Баланс пресной/непресной</p>
              </div>
              <div className="flex items-center justify-center">
                <Bar
                  data={priorityChartData}
                  options={{
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    responsive: true,
                    scales: { x: { beginAtZero: true, suggestedMax: 5 } },
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {showLogin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Вход в систему</h2>
              <button onClick={() => setShowLogin(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Логин</label>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="expert"
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
                  placeholder="password"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Войти
              </button>
              <p className="text-xs text-gray-500 text-center">
                Для демонстрации используйте: логин=expert, пароль=password
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
