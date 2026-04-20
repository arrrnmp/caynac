export type Language = 'es' | 'en';

export interface Translations {
  // Menu
  menuTitle: string;
  menuSubtitle: string;
  selected: string;
  escToQuit: string;

  // Menu options - Maniac
  realDebrid: string;
  realDebridDesc: string;
  compressor: string;
  compressorDesc: string;
  decompressor: string;
  decompressorDesc: string;
  picocrypt: string;
  picocryptDesc: string;
  onboarding: string;
  onboardingDesc: string;
  exit: string;
  exitDesc: string;
  exitManiac: string;

  // Menu options - Caymann
  decrypt: string;
  decryptDesc: string;
  decompress: string;
  decompressDesc: string;
  quit: string;
  quitDesc: string;

  // Language
  language: string;
  languageDesc: string;
  languageTitle: string;
  languageSubtitle: string;
  selectLanguage: string;
  spanish: string;
  english: string;

  // Screen titles
  realDebridTitle: string;
  compressorTitle: string;
  decompressorTitle: string;
  picocryptTitle: string;
  onboardingTitle: string;
  decryptTitle: string;
  decompressTitle: string;
  caymannTitle: string;

  // Prompts
  enterToken: string;
  enterSourcePath: string;
  enterArchivePath: string;
  chooseOperation: string;
  checkingDependencies: string;
  enterPcvPath: string;
  escReturnsToMenu: string;

  // Startup
  startupTitle: string;
  checkingRequiredDeps: string;
  scanningDeps: string;

  // Misc
  backToMenu: string;

  // === DECOMPRESS COMMAND ===
  decompressBadge: string;
  decompressDescShort: string;
  archiveLabel: string;
  archivePathPrompt: string;
  archivePathPlaceholder: string;
  archivePathHint: string;
  outputDirPrompt: string;
  outputDirPlaceholder: string;
  passwordPrompt: string;
  passwordHint: string;
  passwordPlaceholder: string;
  deleteSourcePrompt: string;
  deleteSourceYes: string;
  deleteSourceNo: string;
  extracting: string;
  working: string;
  sourceWillBeDeleted: string;
  extractedSuccess: string;
  outputLabel: string;
  deletedSourceLabel: string;

  // === PICOCRYPT DECRYPT COMMAND ===
  picocryptDecryptBadge: string;
  decryptMode: string;
  binaryLabel: string;
  inputFilePathPrompt: string;
  inputFilePathPlaceholder: string;
  outputPathPrompt: string;
  outputPathPlaceholder: string;
  authMethodLabel: string;
  authPasswordOnly: string;
  authKeyfileOnly: string;
  authPasswordKeyfile: string;
  passwordLabel: string;
  keyfilePathPrompt: string;
  keyfileHint: string;
  keyfilePlaceholder: string;
  keyfileCount: string;
  decrypting: string;
  authPrefix: string;
  decryptedSuccess: string;

  // === PICOCRYPT ENCRYPT COMMAND (MANIAC) ===
  passwordsDoNotMatch: string;
  encryptMode: string;
  operationLabel: string;
  operationEncrypt: string;
  operationEncryptDesc: string;
  operationDecrypt: string;
  operationDecryptDesc: string;
  encryptInputPrompt: string;
  encryptOutputPrompt: string;
  encryptOutputPlaceholder: string;
  autoPlaceholder: string;
  passwordConfirmLabel: string;
  passwordRepeatLabel: string;
  keyfilePathLabel: string;
  keyfileDoneHint: string;
  reedSolomonPrompt: string;
  reedSolomonDesc: string;
  reedSolomonYes: string;
  reedSolomonNo: string;
  deniabilityPrompt: string;
  deniabilityDesc: string;
  deniabilityNo: string;
  deniabilityYes: string;
  commentPrompt: string;
  commentDesc: string;
  encrypting: string;
  encryptedSuccess: string;

  // === COMPRESS COMMAND (MANIAC) ===
  compressBadge: string;
  compressDescShort: string;
  sourceLabel: string;
  sourcePathPrompt: string;
  sourcePathHint: string;
  outputArchivePrompt: string;
  outputArchiveHint: string;
  algoLabel: string;
  algoLzma2: string;
  algoLzma2Desc: string;
  algoZstd: string;
  algoZstdDesc: string;
  levelLabel: string;
  level1: string;
  level3: string;
  level5: string;
  level7: string;
  level9: string;
  passwordEncryptLabel: string;
  passwordEncryptHint: string;
  encryptFilenamesPrompt: string;
  encryptFilenamesHint: string;
  encryptFilenamesYes: string;
  encryptFilenamesNo: string;
  splitSizePrompt: string;
  splitSizeHint: string;
  splitSizePlaceholder: string;
  compressing: string;
  compressStatusEncrypted: string;
  compressStatusFilenamesHidden: string;
  compressStatusSplit: string;
  compressSuccess: string;
  compressSavedTo: string;

  // === REAL-DEBRID COMMAND (MANIAC) ===
  debridBadge: string;
  debridLoggedInAs: string;
  debridTokenPrompt: string;
  debridTokenHint: string;
  debridTokenPlaceholder: string;
  debridMagnetPrompt: string;
  debridMagnetPlaceholder: string;
  debridEnterThe: string;
  verifyingToken: string;
  uploadingTorrent: string;
  processingTorrent: string;
  debridSelectFiles: string;
  debridDownloading: string;
  statusLabel: string;
  debridUnrestricting: string;
  debridOutputDirPrompt: string;
  debridOutputDirPlaceholder: string;
  debridDownloadingFiles: string;
  debridDone: string;
  debridFilesSaved: string;
  debridPressQToReturn: string;

  // === ONBOARDING ===
  onboardingBadge: string;
  onboardingDescShort: string;
  onboardingPlatform: string;
  onboardingPlatformWarning: string;
  sevenZipLabel: string;
  picocryptLabel: string;
  missing: string;
  depsMissing: string;
  depsMissingPlural: string;
  depsInstalled: string;
  installMissingDeps: string;
  rerunChecks: string;
  backToMenuOption: string;
  waitingForInstaller: string;
  onboardingComplete: string;
  preparingMenu: string;
  errorLabel: string;

  // === SHARED COMPONENTS ===
  baseMenuSelected: string;
  errorBoxTitle: string;
  errorBoxGoBack: string;
  multiSelectNav: string;
  multiSelectNothingSelected: string;
}

const translations: Record<Language, Translations> = {
  es: {
    // Menu
    menuTitle: 'MENÚ',
    menuSubtitle: '1-7 inicio rápido · ↑↓ / j,k mover · enter seleccionar',
    selected: 'Seleccionado',
    escToQuit: 'Esc para salir',

    // Menu options - Maniac
    realDebrid: 'Real-Debrid',
    realDebridDesc: 'Desrestricción de torrents + descarga directa',
    compressor: 'Compresor',
    compressorDesc: 'Creador de archivos 7z (LZMA2 / ZSTD)',
    decompressor: 'Descompresor',
    decompressorDesc: 'Extractor 7z + limpieza opcional de fuente',
    picocrypt: 'Picocrypt',
    picocryptDesc: 'Cifrado/descifrado PV2 con archivos clave + ECC',
    onboarding: 'Configuración inicial',
    onboardingDesc: 'Instalar dependencias externas requeridas',
    exit: 'Salir',
    exitDesc: 'Salir',
    exitManiac: 'Salir de MANIAC',

    // Menu options - Caymann
    decrypt: 'Descifrar',
    decryptDesc: 'Descifrar archivo .pcv con Picocrypt',
    decompress: 'Descomprimir',
    decompressDesc: 'Extraer archivo .7z',
    quit: 'Salir',
    quitDesc: 'Salir de caymann',

    // Language
    language: 'Idioma',
    languageDesc: 'Cambiar idioma de la interfaz',
    languageTitle: 'IDIOMA',
    languageSubtitle: '↑↓ / j,k mover · enter seleccionar · Esc volver',
    selectLanguage: 'Seleccionar idioma',
    spanish: 'Español',
    english: 'Inglés',

    // Screen titles
    realDebridTitle: 'REAL-DEBRID',
    compressorTitle: 'COMPRESOR',
    decompressorTitle: 'DESCOMPRESOR',
    picocryptTitle: 'PICOCRYPT',
    onboardingTitle: 'CONFIGURACIÓN INICIAL',
    decryptTitle: 'DESCIFRAR',
    decompressTitle: 'DESCOMPRESOR',
    caymannTitle: 'CAYMANN',

    // Prompts
    enterToken: 'Introducir token API de Real-Debrid',
    enterSourcePath: 'Introducir ruta(s) de origen',
    enterArchivePath: 'Introducir ruta del archivo (.7z, .7z.001…)',
    chooseOperation: 'Elegir operación: cifrar o descifrar',
    checkingDependencies: 'Comprobando dependencias…',
    enterPcvPath: 'Introducir ruta del archivo .pcv',
    escReturnsToMenu: 'Esc vuelve al menú principal',

    // Startup
    startupTitle: 'INICIO',
    checkingRequiredDeps: 'Comprobando dependencias requeridas',
    scanningDeps: 'Escaneando 7-Zip y Picocrypt CLI…',

    // Misc
    backToMenu: 'Volver al menú',

    // === DECOMPRESS COMMAND ===
    decompressBadge: 'Descompresor',
    decompressDescShort: 'Extraer 7z',
    archiveLabel: 'archivo',
    archivePathPrompt: 'ruta del archivo',
    archivePathPlaceholder: '/ruta/al/archivo.7z',
    archivePathHint: '(.7z, .7z.001, etc.)',
    outputDirPrompt: 'Directorio de salida',
    outputDirPlaceholder: '(dejar vacío para mismo directorio que el archivo)',
    passwordPrompt: 'Contraseña',
    passwordHint: '(dejar vacío si el archivo no está cifrado)',
    passwordPlaceholder: 'dejar vacío si no hay contraseña',
    deleteSourcePrompt: '¿Eliminar archivo fuente después de extraer?',
    deleteSourceYes: 'Sí — eliminar archivo(s) una vez extraído',
    deleteSourceNo: 'No — mantener el archivo',
    extracting: 'Extrayendo…',
    working: 'procesando…',
    sourceWillBeDeleted: 'El archivo fuente se eliminará al terminar',
    extractedSuccess: '¡Extraído con éxito!',
    outputLabel: 'Salida:',
    deletedSourceLabel: 'Archivo(s) fuente eliminado(s):',

    // === PICOCRYPT DECRYPT COMMAND ===
    picocryptDecryptBadge: 'Picocrypt',
    decryptMode: '🔓 Descifrar',
    binaryLabel: 'binario:',
    inputFilePathPrompt: 'ruta del archivo de entrada',
    inputFilePathPlaceholder: '/ruta/al/archivo.pcv',
    outputPathPrompt: 'Ruta de salida',
    outputPathPlaceholder: 'dejar vacío para automático',
    authMethodLabel: 'método de autenticación',
    authPasswordOnly: '🔑 Solo contraseña',
    authKeyfileOnly: '📄 Solo archivo clave',
    authPasswordKeyfile: '🔑📄 Contraseña + Archivo clave',
    passwordLabel: 'contraseña',
    keyfilePathPrompt: 'Ruta del archivo clave',
    keyfileHint: '(vacío = terminar de agregar)',
    keyfilePlaceholder: '/ruta/al/archivo-clave (vacío para terminar)',
    keyfileCount: '{N} archivo(s) clave',
    decrypting: 'Descifrando…',
    authPrefix: 'auth:',
    decryptedSuccess: '¡Descifrado con éxito!',

    // === PICOCRYPT ENCRYPT COMMAND (MANIAC) ===
    encryptMode: '🔐 Cifrar',
    operationLabel: 'operación',
    operationEncrypt: '🔐 Cifrar un archivo',
    operationEncryptDesc: 'la salida será .pcv',
    operationDecrypt: '🔓 Descifrar un archivo .pcv',
    operationDecryptDesc: 'descifrar archivo PV2',
    encryptInputPrompt: 'ruta del archivo de entrada',
    encryptOutputPrompt: 'Ruta de salida',
    encryptOutputPlaceholder: 'dejar vacío para automático',
    autoPlaceholder: 'dejar vacío para automático',
    passwordConfirmLabel: 'Confirmar contraseña',
    passwordRepeatLabel: 'repetir contraseña',
    keyfilePathLabel: 'Ruta del archivo clave',
    keyfileDoneHint: 'vacío = terminar de agregar',
    reedSolomonPrompt: 'Corrección de errores Reed-Solomon',
    reedSolomonDesc: '(~3% de sobrecarga, sobrevive corrupción menor)',
    reedSolomonYes: 'Sí — habilitar ECC',
    reedSolomonNo: 'No — omitir',
    passwordsDoNotMatch: 'Las contraseñas no coinciden.',
    deniabilityPrompt: 'Negación Plausible',
    deniabilityDesc: '(salida indistinguible de ruido aleatorio)',
    deniabilityNo: 'No — modo estándar',
    deniabilityYes: 'Sí — negación plausible',
    commentPrompt: 'Incrustar comentario',
    commentDesc: '(visible antes de descifrar — dejar vacío para omitir)',
    encrypting: 'Cifrando…',
    encryptedSuccess: '¡Cifrado con éxito!',

    // === COMPRESS COMMAND (MANIAC) ===
    compressBadge: 'Compresor',
    compressDescShort: '7z · LZMA2 / ZSTD',
    sourceLabel: 'origen',
    sourcePathPrompt: 'ruta(s) de origen',
    sourcePathHint: '(archivos separados por espacio o un directorio)',
    outputArchivePrompt: 'ruta del archivo de salida',
    outputArchiveHint: '(.7z se añadirá si es necesario)',
    algoLabel: 'algoritmo de compresión',
    algoLzma2: 'LZMA2',
    algoLzma2Desc: 'mejor ratio de compresión (por defecto)',
    algoZstd: 'ZSTD',
    algoZstdDesc: 'compresión / descompresión más rápida',
    levelLabel: 'nivel de compresión',
    level1: '1 — más rápido, mayor tamaño',
    level3: '3 — rápido',
    level5: '5 — equilibrado (por defecto)',
    level7: '7 — alta compresión',
    level9: '9 — compresión máxima, más lento',
    passwordEncryptLabel: 'Contraseña',
    passwordEncryptHint: '(dejar vacío para omitir cifrado)',
    encryptFilenamesPrompt: '¿Cifrar nombres de archivo?',
    encryptFilenamesHint: '(-mhe=on, oculta nombres dentro del archivo)',
    encryptFilenamesYes: 'Sí — cifrar nombres (más seguro)',
    encryptFilenamesNo: 'No — nombres visibles en listado del archivo',
    splitSizePrompt: 'Tamaño de división',
    splitSizeHint: '(ej. 4g, 700m, 100m — dejar vacío para omitir)',
    splitSizePlaceholder: 'dejar vacío para archivo único',
    compressing: 'Comprimiendo…',
    compressStatusEncrypted: 'cifrado',
    compressStatusFilenamesHidden: 'nombres ocultos',
    compressStatusSplit: 'dividido {size}',
    compressSuccess: '¡Archivo creado con éxito!',
    compressSavedTo: 'Guardado en',

    // === REAL-DEBRID COMMAND (MANIAC) ===
    debridBadge: 'Real-Debrid',
    debridLoggedInAs: 'conectado como',
    debridTokenPrompt: 'Token API de Real-Debrid',
    debridTokenHint: '(encontrado en real-debrid.com/apitoken)',
    debridTokenPlaceholder: 'tu-token-api',
  debridMagnetPrompt: 'Pega un enlace magnet o introduce una ruta de archivo .torrent',
  debridMagnetPlaceholder: 'magnet:?xt=urn:btih:… o /ruta/al/archivo.torrent',
  debridEnterThe: 'Introduce el',
    verifyingToken: 'Verificando token…',
    uploadingTorrent: 'Subiendo a Real-Debrid…',
    processingTorrent: 'Procesando torrent…',
    debridSelectFiles: 'Seleccionar archivos para descargar de',
    debridDownloading: 'Real-Debrid está descargando el torrent…',
    statusLabel: 'Estado:',
    debridUnrestricting: 'Desrestringiendo {N} enlace(s)…',
    debridOutputDirPrompt: 'directorio de salida',
    debridOutputDirPlaceholder: '/ruta/a/descargas',
  debridDownloadingFiles: 'Descargando {N} archivo(s) → {dir}',
  debridDone: '¡Listo!',
  debridFilesSaved: '{N} archivo(s) guardado(s) en',
  debridPressQToReturn: 'Presiona q para volver al menú',

    // === ONBOARDING ===
    onboardingBadge: 'Configuración inicial',
    onboardingDescShort: 'Instalar dependencias externas: 7-Zip + Picocrypt CLI',
    onboardingPlatform: 'Plataforma:',
    onboardingPlatformWarning: 'La instalación automática actualmente soporta macOS y Windows.',
    sevenZipLabel: 'Binario 7-Zip (7z / 7zz)',
    picocryptLabel: 'Binario Picocrypt CLI',
    missing: '(falta)',
    depsMissing: '{N} dependencia faltante',
    depsMissingPlural: '{N} dependencias faltantes',
    depsInstalled: 'Todas las dependencias externas están instaladas',
    installMissingDeps: 'Instalar dependencias faltantes ahora',
    rerunChecks: 'Volver a verificar',
    backToMenuOption: 'Volver al menú',
    waitingForInstaller: 'Esperando salida del instalador…',
    onboardingComplete: 'Configuración inicial completa. Las dependencias están instaladas.',
    preparingMenu: 'Preparando menú principal…',
    errorLabel: 'Error:',

    // === SHARED COMPONENTS ===
    baseMenuSelected: 'Seleccionado: {label}',
    errorBoxTitle: '✖ Error',
    errorBoxGoBack: 'Presiona q para volver al menú',
    multiSelectNav: '↑↓ navegar espacio alternar a todos n ninguno enter confirmar',
    multiSelectNothingSelected: 'Nada seleccionado — presionar enter seleccionará todo',
  },
  en: {
    // Menu
    menuTitle: 'MENU',
    menuSubtitle: '1-7 quick launch · ↑↓ / j,k move · enter select',
    selected: 'Selected',
    escToQuit: 'Esc to quit',

    // Menu options - Maniac
    realDebrid: 'Real-Debrid',
    realDebridDesc: 'Torrent unrestrict + direct downloader',
    compressor: 'Compressor',
    compressorDesc: '7z archive creator (LZMA2 / ZSTD)',
    decompressor: 'Decompressor',
    decompressorDesc: '7z extractor + optional source cleanup',
    picocrypt: 'Picocrypt',
    picocryptDesc: 'PV2 encrypt/decrypt with keyfiles + ECC',
    onboarding: 'Onboarding',
    onboardingDesc: 'Install required external dependencies',
    exit: 'Exit',
    exitDesc: 'Leave',
    exitManiac: 'Leave MANIAC',

    // Menu options - Caymann
    decrypt: 'Decrypt',
    decryptDesc: 'Decrypt a .pcv file with Picocrypt',
    decompress: 'Decompress',
    decompressDesc: 'Extract a .7z archive',
    quit: 'Quit',
    quitDesc: 'Exit caymann',

    // Language
    language: 'Language',
    languageDesc: 'Change interface language',
    languageTitle: 'LANGUAGE',
    languageSubtitle: '↑↓ / j,k move · enter select · Esc back',
    selectLanguage: 'Select language',
    spanish: 'Spanish',
    english: 'English',

    // Screen titles
    realDebridTitle: 'REAL-DEBRID',
    compressorTitle: 'COMPRESSOR',
    decompressorTitle: 'DECOMPRESSOR',
    picocryptTitle: 'PICOCRYPT',
    onboardingTitle: 'ONBOARDING',
    decryptTitle: 'DECRYPT',
    decompressTitle: 'DECOMPRESS',
    caymannTitle: 'CAYMANN',

    // Prompts
    enterToken: 'Enter Real-Debrid API token',
    enterSourcePath: 'Enter source path(s)',
    enterArchivePath: 'Enter archive path (.7z, .7z.001…)',
    chooseOperation: 'Choose operation: encrypt or decrypt',
    checkingDependencies: 'Checking dependencies…',
    enterPcvPath: 'Enter .pcv file path',
    escReturnsToMenu: 'Esc returns to main menu',

    // Startup
    startupTitle: 'STARTUP',
    checkingRequiredDeps: 'Checking required dependencies',
    scanningDeps: 'Scanning 7-Zip and Picocrypt CLI…',

    // Misc
    backToMenu: 'Back to menu',

    // === DECOMPRESS COMMAND ===
    decompressBadge: 'Decompressor',
    decompressDescShort: '7z extract',
    archiveLabel: 'archive',
    archivePathPrompt: 'archive path',
    archivePathPlaceholder: '/path/to/archive.7z',
    archivePathHint: '(.7z, .7z.001, etc.)',
    outputDirPrompt: 'Output directory',
    outputDirPlaceholder: '(leave empty for same directory as archive)',
    passwordPrompt: 'Password',
    passwordHint: '(leave empty if archive is unencrypted)',
    passwordPlaceholder: 'leave empty if no password',
    deleteSourcePrompt: 'Delete source archive after extraction?',
    deleteSourceYes: 'Yes — delete archive file(s) once extracted',
    deleteSourceNo: 'No — keep the archive',
    extracting: 'Extracting…',
    working: 'working…',
    sourceWillBeDeleted: 'Source archive will be deleted when done',
    extractedSuccess: 'Extracted successfully!',
    outputLabel: 'Output:',
    deletedSourceLabel: 'Deleted source archive(s):',

    // === PICOCRYPT DECRYPT COMMAND ===
    picocryptDecryptBadge: 'Picocrypt',
    decryptMode: '🔓 Decrypt',
    binaryLabel: 'binary:',
    inputFilePathPrompt: 'input file path',
    inputFilePathPlaceholder: '/path/to/file.pcv',
    outputPathPrompt: 'Output path',
    outputPathPlaceholder: 'leave empty for auto',
    authMethodLabel: 'authentication method',
    authPasswordOnly: '🔑 Password only',
    authKeyfileOnly: '📄 Keyfile only',
    authPasswordKeyfile: '🔑📄 Password + Keyfile',
    passwordLabel: 'password',
    keyfilePathPrompt: 'Keyfile path',
    keyfileHint: '(empty = done adding)',
    keyfilePlaceholder: '/path/to/keyfile (empty to finish)',
    keyfileCount: '{N} keyfile(s)',
    decrypting: 'Decrypting…',
    authPrefix: 'auth:',
    decryptedSuccess: 'Decrypted successfully!',

    // === PICOCRYPT ENCRYPT COMMAND (MANIAC) ===
    encryptMode: '🔐 Encrypt',
    operationLabel: 'operation',
    operationEncrypt: '🔐 Encrypt a file',
    operationEncryptDesc: 'output will be .pcv',
    operationDecrypt: '🔓 Decrypt a .pcv file',
    operationDecryptDesc: 'decrypt a PV2 file',
    encryptInputPrompt: 'input file path',
    encryptOutputPrompt: 'Output path',
    encryptOutputPlaceholder: 'leave empty for auto',
    autoPlaceholder: 'leave empty for auto',
    passwordConfirmLabel: 'Confirm password',
    passwordRepeatLabel: 'repeat password',
    keyfilePathLabel: 'Keyfile path',
    keyfileDoneHint: 'empty = done adding',
    reedSolomonPrompt: 'Reed-Solomon error correction',
    reedSolomonDesc: '(~3% overhead, survives minor corruption)',
    reedSolomonYes: 'Yes — enable ECC',
    reedSolomonNo: 'No — skip',
    passwordsDoNotMatch: 'Passwords do not match.',
    deniabilityPrompt: 'Plausible Deniability',
    deniabilityDesc: '(output indistinguishable from random noise)',
    deniabilityNo: 'No — standard mode',
    deniabilityYes: 'Yes — plausible deniability',
    commentPrompt: 'Embed comment',
    commentDesc: '(visible before decryption — leave empty to skip)',
    encrypting: 'Encrypting…',
    encryptedSuccess: 'Encrypted successfully!',

    // === COMPRESS COMMAND (MANIAC) ===
    compressBadge: 'Compressor',
    compressDescShort: '7z · LZMA2 / ZSTD',
    sourceLabel: 'source',
    sourcePathPrompt: 'source path(s)',
    sourcePathHint: '(space-separated files or a directory)',
    outputArchivePrompt: 'output archive path',
    outputArchiveHint: '(.7z will be appended if needed)',
    algoLabel: 'compression algorithm',
    algoLzma2: 'LZMA2',
    algoLzma2Desc: 'best compression ratio (default)',
    algoZstd: 'ZSTD',
    algoZstdDesc: 'faster compression / decompression',
    levelLabel: 'compression level',
    level1: '1 — fastest, largest',
    level3: '3 — fast',
    level5: '5 — balanced (default)',
    level7: '7 — high compression',
    level9: '9 — maximum compression, slowest',
    passwordEncryptLabel: 'Password',
    passwordEncryptHint: '(leave empty to skip encryption)',
    encryptFilenamesPrompt: 'Encrypt filenames?',
    encryptFilenamesHint: '(-mhe=on, hides file names inside the archive)',
    encryptFilenamesYes: 'Yes — encrypt filenames (more secure)',
    encryptFilenamesNo: 'No — filenames visible in archive listing',
    splitSizePrompt: 'Split size',
    splitSizeHint: '(e.g. 4g, 700m, 100m — leave empty to skip)',
    splitSizePlaceholder: 'leave empty for single file',
    compressing: 'Compressing…',
    compressStatusEncrypted: 'encrypted',
    compressStatusFilenamesHidden: 'filenames hidden',
    compressStatusSplit: 'split {size}',
    compressSuccess: 'Archive created successfully!',
    compressSavedTo: 'Saved to',

    // === REAL-DEBRID COMMAND (MANIAC) ===
    debridBadge: 'Real-Debrid',
    debridLoggedInAs: 'logged in as',
    debridTokenPrompt: 'Real-Debrid API token',
    debridTokenHint: '(found at real-debrid.com/apitoken)',
    debridTokenPlaceholder: 'your-api-token',
  debridMagnetPrompt: 'Paste a magnet link or enter a .torrent file path',
  debridMagnetPlaceholder: 'magnet:?xt=urn:btih:… or /path/to/file.torrent',
  debridEnterThe: 'Enter the',
    verifyingToken: 'Verifying token…',
    uploadingTorrent: 'Uploading to Real-Debrid…',
    processingTorrent: 'Processing torrent…',
    debridSelectFiles: 'Select files to download from',
    debridDownloading: 'Real-Debrid is downloading the torrent…',
    statusLabel: 'Status:',
    debridUnrestricting: 'Unrestricting {N} link(s)…',
    debridOutputDirPrompt: 'output directory',
    debridOutputDirPlaceholder: '/path/to/downloads',
  debridDownloadingFiles: 'Downloading {N} file(s) → {dir}',
  debridDone: 'Done!',
  debridFilesSaved: '{N} file(s) saved to',
  debridPressQToReturn: 'Press q to return to the menu',

    // === ONBOARDING ===
    onboardingBadge: 'Onboarding',
    onboardingDescShort: 'Install external dependencies: 7-Zip + Picocrypt CLI',
    onboardingPlatform: 'Platform:',
    onboardingPlatformWarning: 'Automatic install currently supports macOS and Windows.',
    sevenZipLabel: '7-Zip binary (7z / 7zz)',
    picocryptLabel: 'Picocrypt CLI binary',
    missing: '(missing)',
    depsMissing: '{N} dependency missing',
    depsMissingPlural: '{N} dependencies missing',
    depsInstalled: 'All external dependencies are installed',
    installMissingDeps: 'Install missing dependencies now',
    rerunChecks: 'Re-run checks',
    backToMenuOption: 'Back to menu',
    waitingForInstaller: 'Waiting for installer output…',
    onboardingComplete: 'Onboarding complete. Dependencies are installed.',
    preparingMenu: 'Preparing main menu…',
    errorLabel: 'Error:',

    // === SHARED COMPONENTS ===
    baseMenuSelected: 'Selected: {label}',
    errorBoxTitle: '✖ Error',
    errorBoxGoBack: 'Press q to go back to the menu',
    multiSelectNav: '↑↓ navigate space toggle a all n none enter confirm',
    multiSelectNothingSelected: 'Nothing selected — pressing enter will select all',
  },
};

export function getTranslations(lang: Language): Translations {
  return translations[lang];
}

export function getDefaultLanguage(): Language {
  return 'es';
}

export function isValidLanguage(lang: string): lang is Language {
  return lang === 'es' || lang === 'en';
}
