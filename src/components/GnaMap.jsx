import { useState, useEffect, useRef } from 'react'
import { FiSearch, FiMapPin, FiPhone, FiExternalLink, FiNavigation, FiX, FiInfo, FiPlus, FiEdit2, FiSave, FiTrash2, FiMaximize2, FiMinimize2, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { FaWhatsapp, FaGlobeAmericas } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

// Datos masivamente ampliados de las Unidades de Gendarmería Nacional Argentina
const INITIAL_UNITS = [
  // --- JEFATURA Y AGRUPACIONES ---
  { id: 'centinela', name: 'Edificio Centinela (Dirección Nacional)', address: 'Av. Antártida Argentina 1480, CABA', phone: '+54 11 4310-2500', lat: -34.5885, lng: -58.3734, type: 'Dirección Nacional', category: 'jefatura', region: 'CABA' },
  { id: 'region1', name: 'Jefatura de Región I', address: 'Campo de Mayo, Buenos Aires', phone: '+54 11 4666-4100', lat: -34.5442, lng: -58.6722, type: 'Jefatura de Región', category: 'jefatura', region: 'Buenos Aires' },
  { id: 'region2', name: 'Jefatura de Región II', address: 'Rosario, Santa Fe', phone: '+54 341 424-0000', lat: -32.9468, lng: -60.6437, type: 'Jefatura de Región', category: 'jefatura', region: 'Santa Fe' },
  { id: 'region3', name: 'Jefatura de Región III', address: 'Av. Hipólito Yrigoyen 550, Córdoba', phone: '+54 351 422-5500', lat: -31.4172, lng: -64.1833, type: 'Jefatura de Región', category: 'jefatura', region: 'Córdoba' },
  { id: 'region4', name: 'Jefatura de Región IV', address: 'Av. Roca 600, San Miguel de Tucumán', phone: '+54 381 421-2200', lat: -26.8241, lng: -65.2222, type: 'Jefatura de Región', category: 'jefatura', region: 'Tucumán' },
  { id: 'region5', name: 'Jefatura de Región V', address: 'Bahía Blanca, Buenos Aires', phone: '+54 291 455-0000', lat: -38.7183, lng: -62.2725, type: 'Jefatura de Región', category: 'jefatura', region: 'Buenos Aires' },
  { id: 'region6', name: 'Jefatura de Región VI', address: 'Posadas, Misiones', phone: '+54 376 442-2000', lat: -27.3671, lng: -55.8961, type: 'Jefatura de Región', category: 'jefatura', region: 'Misiones' },
  { id: 'region7', name: 'Jefatura de Región VII', address: 'Río Gallegos, Santa Cruz', phone: '+54 2966 422-400', lat: -51.6231, lng: -69.2168, type: 'Jefatura de Región', category: 'jefatura', region: 'Santa Cruz' },
  { id: 'region8', name: 'Jefatura de Región VIII', address: 'Resistencia, Chaco', phone: '+54 362 443-3000', lat: -27.4514, lng: -58.9867, type: 'Jefatura de Región', category: 'jefatura', region: 'Chaco' },
  
  { id: 'agr_corrientes', name: 'Agrupación III "Corrientes"', address: 'Corrientes, Corrientes', phone: '+54 379 442-3000', lat: -27.4692, lng: -58.8306, type: 'Agrupación', category: 'jefatura', region: 'Corrientes' },
  { id: 'agr_misiones', name: 'Agrupación IV "Misiones"', address: 'Posadas, Misiones', phone: '+54 376 442-2000', lat: -27.3671, lng: -55.8961, type: 'Agrupación', category: 'jefatura', region: 'Misiones' },
  { id: 'agr_entrerios', name: 'Agrupación V "Entre Ríos"', address: 'Paraná, Entre Ríos', phone: '+54 343 423-1000', lat: -31.7333, lng: -60.5292, type: 'Agrupación', category: 'jefatura', region: 'Entre Ríos' },
  { id: 'agr_formosa', name: 'Agrupación VI "Formosa"', address: 'Formosa, Formosa', phone: '+54 370 443-1000', lat: -26.185, lng: -58.173, type: 'Agrupación', category: 'jefatura', region: 'Formosa' },
  { id: 'agr_salta', name: 'Agrupación VII "Salta"', address: 'Salta, Salta', phone: '+54 387 421-2000', lat: -24.7821, lng: -65.4106, type: 'Agrupación', category: 'jefatura', region: 'Salta' },
  { id: 'agr_catamarca', name: 'Agrupación VIII "Catamarca"', address: 'Catamarca, Catamarca', phone: '+54 383 442-4000', lat: -28.468, lng: -65.785, type: 'Agrupación', category: 'jefatura', region: 'Catamarca' },
  { id: 'agr_jujuy', name: 'Agrupación IX "Jujuy"', address: 'San Salvador de Jujuy, Jujuy', phone: '+54 388 423-1000', lat: -24.185, lng: -65.299, type: 'Agrupación', category: 'jefatura', region: 'Jujuy' },
  { id: 'agr_sanjuan', name: 'Agrupación X "San Juan"', address: 'San Juan, San Juan', phone: '+54 264 421-6000', lat: -31.5375, lng: -68.5364, type: 'Agrupación', category: 'jefatura', region: 'San Juan' },
  { id: 'agr_mendoza', name: 'Agrupación XI "Mendoza"', address: 'Mendoza, Mendoza', phone: '+54 261 423-5000', lat: -32.8895, lng: -68.8458, type: 'Agrupación', category: 'jefatura', region: 'Mendoza' },
  { id: 'agr_comahue', name: 'Agrupación XII "Comahue"', address: 'Neuquén, Neuquén', phone: '+54 299 443-3000', lat: -38.9516, lng: -68.0591, type: 'Agrupación', category: 'jefatura', region: 'Neuquén' },
  { id: 'agr_chubut', name: 'Agrupación XIV "Chubut"', address: 'Rawson, Chubut', phone: '+54 2965 481-200', lat: -43.3, lng: -65.1023, type: 'Agrupación', category: 'jefatura', region: 'Chubut' },
  { id: 'agr_rosario', name: 'Agrupación XV "Rosario"', address: 'Rosario, Santa Fe', phone: '+54 341 424-0000', lat: -32.9468, lng: -60.6437, type: 'Agrupación', category: 'jefatura', region: 'Santa Fe' },
  { id: 'agr_santacruz', name: 'Agrupación XVI "Santa Cruz"', address: 'Río Gallegos, Santa Cruz', phone: '+54 2966 422-400', lat: -51.6231, lng: -69.2168, type: 'Agrupación', category: 'jefatura', region: 'Santa Cruz' },
  { id: 'agr_santiago', name: 'Agrupación XVII "Santiago del Estero"', address: 'Santiago del Estero', phone: '+54 385 422-3000', lat: -27.7834, lng: -64.2642, type: 'Agrupación', category: 'jefatura', region: 'Santiago del Estero' },
  { id: 'agr_tdf', name: 'Agrupación XIX "Tierra del Fuego"', address: 'Ushuaia, Tierra del Fuego', phone: '+54 2901 421-600', lat: -54.8019, lng: -68.303, type: 'Agrupación', category: 'jefatura', region: 'Tierra del Fuego' },
  { id: 'agr_cordoba', name: 'Agrupación XX "Córdoba"', address: 'Río Ceballos, Córdoba', phone: '+54 351 422-5500', lat: -31.171, lng: -64.316, type: 'Agrupación', category: 'jefatura', region: 'Córdoba' },
  { id: 'agr_santafe', name: 'Agrupación XXI "Santa Fe"', address: 'Santa Fe, Santa Fe', phone: '+54 342 453-2000', lat: -31.6333, lng: -60.7, type: 'Agrupación', category: 'jefatura', region: 'Santa Fe' },

  // --- DESTACAMENTOS MÓVILES ---
  { id: 'movil1', name: 'Destacamento Móvil 1', address: 'Campo de Mayo, Buenos Aires', phone: '+54 11 4666-4100', lat: -34.5442, lng: -58.6722, type: 'Destacamento Móvil', category: 'escuadron', region: 'Buenos Aires' },
  { id: 'movil2', name: 'Destacamento Móvil 2', address: 'Rosario, Santa Fe', phone: '+54 341 424-0000', lat: -32.9468, lng: -60.6437, type: 'Destacamento Móvil', category: 'escuadron', region: 'Santa Fe' },
  { id: 'movil3', name: 'Destacamento Móvil 3', address: 'Colonia Caroya, Córdoba', phone: '+54 3525 401-200', lat: -31.026, lng: -64.093, type: 'Destacamento Móvil', category: 'escuadron', region: 'Córdoba' },
  { id: 'movil4', name: 'Destacamento Móvil 4', address: 'General Acha, La Pampa', phone: '+54 2952 432-100', lat: -37.377, lng: -64.604, type: 'Destacamento Móvil', category: 'escuadron', region: 'La Pampa' },
  { id: 'movil5', name: 'Destacamento Móvil 5', address: 'Santiago del Estero', phone: '+54 385 422-3000', lat: -27.7834, lng: -64.2642, type: 'Destacamento Móvil', category: 'escuadron', region: 'Santiago del Estero' },
  { id: 'movil6', name: 'Destacamento Móvil 6', address: 'Ezeiza, Buenos Aires', phone: '+54 11 4480-1000', lat: -34.833, lng: -58.517, type: 'Destacamento Móvil', category: 'escuadron', region: 'Buenos Aires' },

  // --- ESCUADRONES (Lotes anteriores y nuevos) ---
  { id: 'esc1', name: 'Escuadrón 1 "Roque Sáenz Peña"', address: 'Sáenz Peña, Chaco', phone: '+54 3644 420-500', lat: -26.807, lng: -60.448, type: 'Escuadrón', category: 'escuadron', region: 'Chaco' },
  { id: 'esc5', name: 'Escuadrón 5 "La Quiaca"', address: 'La Quiaca, Jujuy', phone: '+54 3885 422-200', lat: -22.106, lng: -65.596, type: 'Escuadrón', category: 'escuadron', region: 'Jujuy' },
  { id: 'esc6', name: 'Escuadrón 6 "Concepción del Uruguay"', address: 'Entre Ríos', phone: 'S/N', lat: -32.4940, lng: -58.2452, type: 'Escuadrón', category: 'escuadron', region: 'Entre Ríos' },
  { id: 'esc7', name: 'Escuadrón 7 "Paso de los Libres"', address: 'Corrientes', phone: 'S/N', lat: -29.7007, lng: -57.0898, type: 'Escuadrón', category: 'escuadron', region: 'Corrientes' },
  { id: 'esc9', name: 'Escuadrón 9 "Oberá"', address: 'Misiones', phone: 'S/N', lat: -27.4887, lng: -55.1093, type: 'Escuadrón', category: 'escuadron', region: 'Misiones' },
  { id: 'esc10', name: 'Escuadrón 10 "Eldorado"', address: 'Eldorado, Misiones', phone: '+54 3751 421-300', lat: -26.403, lng: -54.629, type: 'Escuadrón', category: 'escuadron', region: 'Misiones' },
  { id: 'esc11', name: 'Escuadrón 11 "San Ignacio"', address: 'San Ignacio, Misiones', phone: '+54 376 443-4000', lat: -27.263, lng: -55.545, type: 'Escuadrón', category: 'escuadron', region: 'Misiones' },
  { id: 'esc12', name: 'Escuadrón 12 "Bernardo de Irigoyen"', address: 'Bernardo de Irigoyen, Misiones', phone: '+54 3741 420-100', lat: -26.277, lng: -53.675, type: 'Escuadrón', category: 'escuadron', region: 'Misiones' },
  { id: 'esc13', name: 'Escuadrón 13 "Iguazú"', address: 'Puerto Iguazú, Misiones', phone: '+54 3757 421-200', lat: -25.603, lng: -54.570, type: 'Escuadrón', category: 'escuadron', region: 'Misiones' },
  { id: 'esc14', name: 'Escuadrón 14 "Las Palmas"', address: 'Las Palmas, Chaco', phone: '+54 362 443-3000', lat: -27.051, lng: -58.704, type: 'Escuadrón', category: 'escuadron', region: 'Chaco' },
  { id: 'esc16', name: 'Escuadrón 16 "Clorinda"', address: 'Clorinda, Formosa', phone: '+54 3718 421-200', lat: -25.323, lng: -57.704, type: 'Escuadrón', category: 'escuadron', region: 'Formosa' },
  { id: 'esc18', name: 'Escuadrón 18 "Lomitas"', address: 'Las Lomitas, Formosa', phone: '+54 3715 432-100', lat: -24.707, lng: -60.593, type: 'Escuadrón', category: 'escuadron', region: 'Formosa' },
  { id: 'esc19', name: 'Escuadrón 19 "Ingeniero Juárez"', address: 'Ingeniero Juárez, Formosa', phone: '+54 3711 421-000', lat: -24.327, lng: -61.851, type: 'Escuadrón', category: 'escuadron', region: 'Formosa' },
  { id: 'esc20', name: 'Escuadrón 20 "Orán"', address: 'San Ramón de la Nueva Orán, Salta', phone: '+54 3878 421-200', lat: -23.137, lng: -64.326, type: 'Escuadrón', category: 'escuadron', region: 'Salta' },
  { id: 'esc22', name: 'Escuadrón 22 "San Antonio de los Cobres"', address: 'Salta', phone: '+54 387 490-9000', lat: -24.231, lng: -66.319, type: 'Escuadrón', category: 'escuadron', region: 'Salta' },
  { id: 'esc23', name: 'Escuadrón 23 "Tinogasta"', address: 'Tinogasta, Catamarca', phone: '+54 3837 420-100', lat: -28.064, lng: -67.564, type: 'Escuadrón', category: 'escuadron', region: 'Catamarca' },
  { id: 'esc24', name: 'Escuadrón 24 "Chilecito"', address: 'La Rioja', phone: 'S/N', lat: -29.1602, lng: -67.5039, type: 'Escuadrón', category: 'escuadron', region: 'La Rioja' },
  { id: 'esc25', name: 'Escuadrón 25 "Jáchal"', address: 'San Juan', phone: 'S/N', lat: -30.2434, lng: -68.7381, type: 'Escuadrón', category: 'escuadron', region: 'San Juan' },
  { id: 'esc26', name: 'Escuadrón 26 "Barreal"', address: 'San Juan', phone: 'S/N', lat: -31.6529, lng: -69.4713, type: 'Escuadrón', category: 'escuadron', region: 'San Juan' },
  { id: 'esc27', name: 'Escuadrón 27 "Uspallata"', address: 'Mendoza', phone: 'S/N', lat: -32.5933, lng: -69.3397, type: 'Escuadrón', category: 'escuadron', region: 'Mendoza' },
  { id: 'esc28', name: 'Escuadrón 28 "Tunuyán"', address: 'Mendoza', phone: 'S/N', lat: -33.5895, lng: -69.0154, type: 'Escuadrón', category: 'escuadron', region: 'Mendoza' },
  { id: 'esc29', name: 'Escuadrón 29 "Malargüe"', address: 'Mendoza', phone: 'S/N', lat: -35.4822, lng: -69.5861, type: 'Escuadrón', category: 'escuadron', region: 'Mendoza' },
  { id: 'esc30', name: 'Escuadrón 30 "Chos Malal"', address: 'Neuquén', phone: 'S/N', lat: -37.3748, lng: -70.2685, type: 'Escuadrón', category: 'escuadron', region: 'Neuquén' },
  { id: 'esc31', name: 'Escuadrón 31 "Las Lajas"', address: 'Neuquén', phone: 'S/N', lat: -38.5246, lng: -70.3613, type: 'Escuadrón', category: 'escuadron', region: 'Neuquén' },
  { id: 'esc34', name: 'Escuadrón 34 "Bariloche"', address: 'Río Negro', phone: 'S/N', lat: -41.1421, lng: -71.3032, type: 'Escuadrón', category: 'escuadron', region: 'Río Negro' },
  { id: 'esc35', name: 'Escuadrón 35 "El Bolsón"', address: 'Río Negro', phone: 'S/N', lat: -41.9822, lng: -71.5260, type: 'Escuadrón', category: 'escuadron', region: 'Río Negro' },
  { id: 'esc36', name: 'Escuadrón 36 "Esquel"', address: 'Chubut', phone: 'S/N', lat: -42.9044, lng: -71.3114, type: 'Escuadrón', category: 'escuadron', region: 'Chubut' },
  { id: 'esc37', name: 'Escuadrón 37 "José de San Martín"', address: 'Chubut', phone: 'S/N', lat: -44.0495, lng: -70.4698, type: 'Escuadrón', category: 'escuadron', region: 'Chubut' },
  { id: 'esc38', name: 'Escuadrón 38 "Río Mayo"', address: 'Chubut', phone: 'S/N', lat: -45.6877, lng: -70.2614, type: 'Escuadrón', category: 'escuadron', region: 'Chubut' },
  { id: 'esc41', name: 'Escuadrón 41 "Comodoro Rivadavia"', address: 'Chubut', phone: 'S/N', lat: -45.8350, lng: -67.4753, type: 'Escuadrón', category: 'escuadron', region: 'Chubut' },
  { id: 'esc42', name: 'Escuadrón 42 "El Calafate"', address: 'Santa Cruz', phone: 'S/N', lat: -50.3401, lng: -72.2711, type: 'Escuadrón', category: 'escuadron', region: 'Santa Cruz' },
  { id: 'esc43', name: 'Escuadrón 43 "Río Turbio"', address: 'Santa Cruz', phone: 'S/N', lat: -51.5375, lng: -72.3313, type: 'Escuadrón', category: 'escuadron', region: 'Santa Cruz' },
  { id: 'esc47', name: 'Escuadrón 47 "Ituzaingó"', address: 'Corrientes', phone: 'S/N', lat: -27.5712, lng: -56.6700, type: 'Escuadrón', category: 'escuadron', region: 'Corrientes' },
  { id: 'esc48', name: 'Escuadrón 48 "Corrientes"', address: 'Corrientes', phone: 'S/N', lat: -27.4714, lng: -58.8216, type: 'Escuadrón', category: 'escuadron', region: 'Corrientes' },
  { id: 'esc50', name: 'Escuadrón 50 "Posadas"', address: 'Misiones', phone: 'S/N', lat: -27.3622, lng: -55.8926, type: 'Escuadrón', category: 'escuadron', region: 'Misiones' },
  { id: 'esc51', name: 'Escuadrón 51 "Fontana"', address: 'Chaco', phone: 'S/N', lat: -27.4161, lng: -59.0317, type: 'Escuadrón', category: 'escuadron', region: 'Chaco' },
  { id: 'esc53', name: 'Escuadrón 53 "Jujuy"', address: 'Jujuy', phone: 'S/N', lat: -24.2190, lng: -65.2680, type: 'Escuadrón', category: 'escuadron', region: 'Jujuy' },
  { id: 'esc57', name: 'Escuadrón 57 "Santo Tomé"', address: 'Corrientes', phone: 'S/N', lat: -28.5647, lng: -56.0615, type: 'Escuadrón', category: 'escuadron', region: 'Corrientes' },
  { id: 'esc60', name: 'Escuadrón 60 "San Pedro"', address: 'San Pedro de Jujuy, Jujuy', phone: 'S/N', lat: -24.2325, lng: -64.8667, type: 'Escuadrón', category: 'escuadron', region: 'Jujuy' },
  { id: 'esc61', name: 'Escuadrón 61 "Salvador Mazza"', address: 'Salvador Mazza, Salta', phone: 'S/N', lat: -22.052, lng: -63.6888, type: 'Escuadrón', category: 'escuadron', region: 'Salta' },
  { id: 'esc62', name: 'Escuadrón 62 "Río Grande"', address: 'Río Grande, Tierra del Fuego', phone: 'S/N', lat: -53.785, lng: -67.697, type: 'Escuadrón', category: 'escuadron', region: 'Tierra del Fuego' },
  { id: 'esc63', name: 'Escuadrón 63 "Zárate Brazo Largo"', address: 'Zárate, Buenos Aires', phone: 'S/N', lat: -34.098, lng: -59.028, type: 'Escuadrón', category: 'escuadron', region: 'Buenos Aires' },
  { id: 'esc64', name: 'Escuadrón 64 "Mendoza"', address: 'Luján de Cuyo, Mendoza', phone: 'S/N', lat: -33.003, lng: -68.919, type: 'Escuadrón', category: 'escuadron', region: 'Mendoza' },
  { id: 'esc65', name: 'Escuadrón 65 "Córdoba"', address: 'Sinsacate, Córdoba', phone: 'S/N', lat: -30.957, lng: -64.082, type: 'Escuadrón', category: 'escuadron', region: 'Córdoba' },
  { id: 'esc66', name: 'Escuadrón 66 "San Juan"', address: 'Marquesado, San Juan', phone: 'S/N', lat: -31.537, lng: -68.536, type: 'Escuadrón', category: 'escuadron', region: 'San Juan' },
  { id: 'esc67', name: 'Escuadrón 67 "Catamarca"', address: 'Catamarca, Catamarca', phone: 'S/N', lat: -28.468, lng: -65.785, type: 'Escuadrón', category: 'escuadron', region: 'Catamarca' },
  { id: 'esc68', name: 'Escuadrón 68 "Paso de los Indios"', address: 'Paso de los Indios, Chubut', phone: 'S/N', lat: -43.734, lng: -69.055, type: 'Escuadrón', category: 'escuadron', region: 'Chubut' },
  
  // --- SEGURIDAD VIAL ---
  { id: 'escvialsannicolas', name: 'Escuadrón Seguridad Vial "San Nicolás"', address: 'San Nicolás, Buenos Aires', phone: '+54 336 447-5471', lat: -33.3909, lng: -60.2019, type: 'Vial', category: 'vial', region: 'Buenos Aires' },
  { id: 'escvialvillamaria', name: 'Escuadrón Seguridad Vial "Villa María"', address: 'Villa María, Córdoba', phone: '+54 353 453-2000', lat: -32.4167, lng: -63.2333, type: 'Vial', category: 'vial', region: 'Córdoba' },
  { id: 'escvialsur', name: 'Escuadrón de Seguridad Vial "Sur"', address: 'Ezeiza, Buenos Aires', phone: 'S/N', lat: -34.7874, lng: -58.5236, type: 'Vial', category: 'vial', region: 'Buenos Aires' },

  // --- SECCIONES Y OTROS ---
  { id: 'sec_aviacion_trevelin', name: 'Sección Aviación Trevelin', address: 'Chubut', phone: 'S/N', lat: -43.0877, lng: -71.4770, type: 'Sección', category: 'jefatura', region: 'Chubut' },
  { id: 'esc_seg_norte', name: 'Escuadrón Seguridad "Norte"', address: 'Pilar, Buenos Aires', phone: 'S/N', lat: -34.4970, lng: -58.7110, type: 'Seguridad', category: 'escuadron', region: 'Buenos Aires' },
  { id: 'esc_seg_chocon', name: 'Escuadrón Seguridad "El Chocón"', address: 'Neuquén', phone: 'S/N', lat: -39.2577, lng: -68.7737, type: 'Seguridad', category: 'escuadron', region: 'Neuquén' },
  { id: 'esc_nucleo_mendoza', name: 'Escuadrón Núcleo Mendoza', address: 'Mendoza', phone: 'S/N', lat: -33.0741, lng: -68.9710, type: 'Núcleo', category: 'escuadron', region: 'Mendoza' },
];

export default function GnaMap({ isAdmin }) {
  const [units, setUnits] = useState(INITIAL_UNITS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [hoveredUnitId, setHoveredUnitId] = useState(null);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Refs para Leaflet
  const mapRef = useRef(null);
  const leafletLoaded = useRef(false);
  const markersRef = useRef({});

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    lat: '',
    lng: '',
    type: 'Escuadrón',
    category: 'escuadron',
    region: ''
  });

  const filteredUnits = units.filter(unit => {
    const term = searchTerm.toLowerCase();
    return unit.name.toLowerCase().includes(term) ||
           unit.region.toLowerCase().includes(term) ||
           unit.type.toLowerCase().includes(term) ||
           unit.category.toLowerCase().includes(term);
  });

  useEffect(() => {
    // Re-inicializar marcadores si las unidades cambian
    if (window.L && mapRef.current) {
      updateMarkers();
    }
  }, [units]);

  // Manejar el cambio de tamaño cuando se expande
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 400);
    }
  }, [isExpanded]);

  // Cargar Leaflet una sola vez
  useEffect(() => {
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        initMap();
        updateMarkers();
      };
      document.head.appendChild(script);
    } else {
      initMap();
      updateMarkers();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (!window.L || mapRef.current) return;
    const L = window.L;
    
    const container = document.getElementById('gna-map-container');
    if (!container) return;

    mapRef.current = L.map('gna-map-container', {
      center: [-38.4161, -63.6167],
      zoom: 4,
      zoomControl: false
    });

    // Definir las capas de mapa
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    });

    const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3'],
        attribution: '&copy; Google Maps'
    });

    const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3'],
        attribution: '&copy; Google Maps'
    });

    const googleTerrain = L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',{
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3'],
        attribution: '&copy; Google Maps'
    });

    // Añadir la capa inicial
    osm.addTo(mapRef.current);

    // Crear el control de capas
    const baseMaps = {
      "Mapa Estándar": osm,
      "Vista Satélite": googleSat,
      "Vista Híbrida": googleHybrid,
      "Vista Terreno": googleTerrain
    };

    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(mapRef.current);
    L.control.zoom({ position: 'topright' }).addTo(mapRef.current);

    // Añadir Brújula (Puntos Cardinales)
    const CompassControl = L.Control.extend({
      onAdd: function() {
        const div = L.DomUtil.create('div', 'compass-control');
        div.innerHTML = `
          <div class="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-dashboard-border flex flex-col items-center justify-center gap-1 min-w-[60px]">
            <div class="text-[10px] font-black text-red-600 mb-1">N</div>
            <div class="flex items-center gap-4 text-[10px] font-black text-dashboard-text">
              <span>O</span>
              <div class="w-2 h-2 rounded-full bg-dashboard-primary"></div>
              <span>E</span>
            </div>
            <div class="text-[10px] font-black text-dashboard-text mt-1">S</div>
          </div>
        `;
        return div;
      }
    });
    new CompassControl({ position: 'bottomright' }).addTo(mapRef.current);
  };

  const updateMarkers = () => {
    if (!window.L || !mapRef.current) return;
    const L = window.L;

    // Limpiar marcadores anteriores
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    const bounds = L.latLngBounds();
    let hasValidPoints = false;

    // Crear marcadores
    units.forEach(unit => {
      const lat = parseFloat(unit.lat);
      const lng = parseFloat(unit.lng);
      
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], {
        title: unit.name
      }).addTo(mapRef.current);
      
      bounds.extend([lat, lng]);
      hasValidPoints = true;
      markersRef.current[unit.id] = marker;
      
      marker.on('click', () => handleUnitClick(unit));
    });

    if (hasValidPoints) {
      mapRef.current.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 10,
        animate: true
      });
    } else {
      // Default center if no units
      mapRef.current.setView([-38.4161, -63.6167], 4);
    }
  };

  const handleUnitClick = (unit) => {
    setSelectedUnit(unit);
    if (mapRef.current) {
      const lat = parseFloat(unit.lat);
      const lng = parseFloat(unit.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        mapRef.current.flyTo([lat, lng], 12);
      }
    }
  };

  const handleSaveUnit = (e) => {
    e.preventDefault();
    const newUnit = {
      ...formData,
      id: editingUnit ? editingUnit.id : `unit-${Date.now()}`,
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng)
    };

    if (editingUnit) {
      setUnits(units.map(u => u.id === editingUnit.id ? newUnit : u));
      toast.success('Unidad actualizada');
    } else {
      setUnits([...units, newUnit]);
      toast.success('Unidad agregada');
    }

    setShowUnitForm(false);
    setEditingUnit(null);
    setFormData({ name: '', address: '', phone: '', lat: '', lng: '', type: 'Escuadrón', category: 'escuadron', region: '' });
  };

  const startEdit = (unit) => {
    setEditingUnit(unit);
    setFormData({ ...unit });
    setShowUnitForm(true);
    setSelectedUnit(null);
  };

  const handleDeleteUnit = (id) => {
    if (window.confirm('¿Eliminar esta unidad?')) {
      setUnits(units.filter(u => u.id !== id));
      setSelectedUnit(null);
      toast.success('Unidad eliminada');
    }
  };

  const sendWhatsApp = (unit) => {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${unit.lat},${unit.lng}`;
    const text = `🔹 *UNIDAD GNA: ${unit.name}*\n📍 *Dirección:* ${unit.address}\n📞 *Teléfono:* ${unit.phone}\n🌍 *Ubicación:* ${googleMapsUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const [showList, setShowList] = useState(true);

  return (
    <div className={`flex flex-col h-auto min-h-[calc(100vh-120px)] lg:h-[calc(100vh-140px)] p-4 lg:p-8 gap-4 lg:gap-6 ${isExpanded ? '' : 'animate-fade-up'}`}>
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/50 backdrop-blur-md p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-dashboard-primary/10 rounded-2xl flex items-center justify-center text-dashboard-primary shrink-0">
              <FaGlobeAmericas className="text-xl sm:text-2xl animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg lg:text-xl font-black text-dashboard-text tracking-tight uppercase leading-tight">Unidades de GNA</h2>
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Territorio Patrio</p>
            </div>
          </div>
          
          {isAdmin && (
            <button 
              onClick={() => { setEditingUnit(null); setShowUnitForm(true); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-dashboard-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-dashboard-primary/90 transition-all shadow-lg shadow-dashboard-primary/20 shrink-0"
            >
              <FiPlus /> Agregar Unidad
            </button>
          )}
        </div>

        <div className="relative group w-full lg:w-80">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar unidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-xs font-semibold outline-none focus:bg-white focus:border-dashboard-primary transition-all shadow-inner"
          />
        </div>
      </div>

      <div className="flex-1 flex-col lg:flex-row flex gap-4 lg:gap-6 min-h-0 overflow-visible lg:overflow-hidden">
        
        {/* List */}
        <div className={`w-full lg:w-[450px] flex flex-col gap-4 bg-white p-4 rounded-[2rem] lg:rounded-[2.5rem] border border-dashboard-border shadow-sm transition-all duration-300 overflow-hidden shrink-0 ${
          showList ? 'h-[400px] lg:h-full' : 'h-[60px] lg:h-full'
        }`}>
          <div className="px-4 py-2 border-b border-slate-50 flex justify-between items-center cursor-pointer" onClick={() => setShowList(!showList)}>
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unidades ({units.length})</span>
             <button className="text-dashboard-primary sm:hidden">
               {showList ? <FiChevronDown className="text-lg" /> : <FiChevronUp className="text-lg" />}
             </button>
          </div>
          {showList && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 no-scrollbar animate-fade-in">
              {filteredUnits.map(unit => (
                <div 
                  key={unit.id}
                  onClick={() => handleUnitClick(unit)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedUnit?.id === unit.id 
                      ? 'bg-dashboard-primary border-dashboard-primary text-white shadow-lg shadow-dashboard-primary/20' 
                      : 'bg-slate-50 border-transparent hover:border-dashboard-primary/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <FiMapPin className={selectedUnit?.id === unit.id ? 'text-white' : 'text-dashboard-primary'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black truncate">{unit.name}</p>
                      <p className={`text-[8px] font-bold uppercase ${selectedUnit?.id === unit.id ? 'text-white/70' : 'text-slate-400'}`}>
                        {unit.type} &bull; {unit.region}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map Container Area */}
        <div className={`flex-1 flex flex-col min-h-[650px] lg:min-h-0 ${isExpanded ? 'fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm p-0 sm:p-8 flex items-center justify-center' : 'relative z-10'}`}>
          <div className={`w-full h-[650px] lg:h-full bg-white border border-dashboard-border shadow-2xl overflow-hidden relative transition-all duration-500 ease-in-out ${
            isExpanded ? 'rounded-0 sm:rounded-[2.5rem] max-w-7xl sm:max-h-[90vh]' : 'rounded-[2rem] lg:rounded-[2.5rem]'
          }`}>
            {/* Expand Toggle Button - Positioned below Leaflet controls */}
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`absolute top-44 right-3 z-[1000] w-12 h-12 rounded-xl shadow-xl flex items-center justify-center transition-all ${
                isExpanded 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-white text-dashboard-text hover:text-dashboard-primary border border-dashboard-border'
              }`}
              title={isExpanded ? "Contraer Mapa" : "Ampliar Mapa"}
            >
              {isExpanded ? <FiMinimize2 className="text-xl" /> : <FiMaximize2 className="text-xl" />}
            </button>

            <div id="gna-map-container" className="w-full h-full z-10" />
            
            {/* Selected Unit Overlay (inside map to stay with it) */}
            {selectedUnit && (
               <div className="absolute bottom-6 left-6 right-6 lg:left-auto lg:right-8 lg:w-96 z-[1000] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-dashboard-border p-6 animate-fade-up">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-dashboard-primary rounded-xl flex items-center justify-center text-white"><FiMapPin /></div>
                    <div>
                      <h3 className="text-sm font-black text-dashboard-text leading-tight">{selectedUnit.name}</h3>
                      <span className="text-[10px] font-black uppercase text-dashboard-primary tracking-widest">{selectedUnit.type}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUnit(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><FiX /></button>
                </div>
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <FiNavigation className="text-slate-400 mt-1 shrink-0" />
                    <p className="text-xs font-bold text-slate-600">{selectedUnit.address}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <FiPhone className="text-slate-400 shrink-0" />
                    <p className="text-xs font-bold text-slate-600">{selectedUnit.phone}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => sendWhatsApp(selectedUnit)} className="flex-1 py-3 bg-[#25D366] text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#128C7E] transition-all shadow-lg shadow-[#25D366]/20">
                    <FaWhatsapp className="text-base" /> Compartir
                  </button>
                  {isAdmin && (
                    <>
                      <button onClick={() => startEdit(selectedUnit)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><FiEdit2 /></button>
                      <button onClick={() => handleDeleteUnit(selectedUnit.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><FiTrash2 /></button>
                    </>
                  )}
                </div>
             </div>
          )}
        </div>
      </div>
    </div>

      {/* Admin Form Modal */}
      {showUnitForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-up">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-dashboard-primary/10 rounded-xl flex items-center justify-center text-dashboard-primary"><FiPlus /></div>
                <h3 className="text-lg font-black text-dashboard-text uppercase tracking-tight">{editingUnit ? 'Modificar Unidad' : 'Nueva Unidad GNA'}</h3>
              </div>
              <button onClick={() => setShowUnitForm(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><FiX /></button>
            </div>
            <form onSubmit={handleSaveUnit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nombre de la Unidad</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-dashboard-primary transition-all outline-none" placeholder="Ej: Escuadrón 44 Ushuaia" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Dirección</label>
                  <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-dashboard-primary transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Teléfono</label>
                  <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-dashboard-primary transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Latitud</label>
                  <input required type="number" step="any" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-dashboard-primary transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Longitud</label>
                  <input required type="number" step="any" value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-dashboard-primary transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Categoría</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-dashboard-primary transition-all outline-none">
                    <option value="jefatura">Jefatura</option>
                    <option value="escuadron">Escuadrón</option>
                    <option value="vial">Seguridad Vial</option>
                    <option value="instituto">Instituto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Región / Provincia</label>
                  <input required type="text" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-dashboard-primary transition-all outline-none" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-dashboard-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-dashboard-primary/90 transition-all shadow-xl shadow-dashboard-primary/20">
                <FiSave /> {editingUnit ? 'Actualizar Cambios' : 'Guardar Nueva Unidad'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fade-up 0.5s ease-out forwards; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-container { background: #f8fafc !important; font-family: inherit; }
        .leaflet-marker-icon { filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
      `}} />
    </div>
  )
}
