// Temas de ayuda del core: sirven para cualquier proyecto (primeros pasos, panel, personal, permisos, banners).
// Los de cada rubro los aporta su modulo.js (`ayuda`). Formato y reglas de acceso: ayuda_temas.js.
// Escritos para alguien que nunca usó el sistema: frases cortas, sin palabras técnicas, con ejemplos.
export const temasAyudaCore = [
  {
    id: "bienvenida",
    grupo: "Primeros pasos",
    titulo: "Empezá acá: cómo funciona el sistema",
    resumen: "Lo básico para arrancar: qué es el panel, cómo moverte, cómo se guardan los cambios y dónde pedir ayuda.",
    palabras: ["empezar", "inicio", "primera vez", "nuevo", "como se usa", "tutorial", "guia"],
    reglas: ["PAN-01", "PAN-10", "PAN-20"],
    secciones: [
      { titulo: "Qué es este sistema", texto: [
        "El sistema tiene dos partes. La tienda es la página que ven los clientes: ahí miran los productos, arman el carrito y envían su pedido. El panel de gestión (donde estás ahora) es la parte del equipo: desde acá se cargan los artículos y los precios, se atienden los pedidos y se registran los cobros.",
        "Los clientes nunca entran al panel. Todo lo que cambies acá (un precio, una foto, un artículo nuevo) se ve en la tienda apenas lo guardás.",
      ] },
      { titulo: "Cómo está armada la pantalla", pasos: [
        "A la izquierda está el menú, con las pantallas agrupadas por tema (por ejemplo \"Distribuidora\" o \"Gestión\"). En el celular el menú está escondido: se abre con el botón ☰ de arriba a la izquierda.",
        "Arriba ves el nombre de la pantalla en la que estás y, a la derecha, \"Ver tienda\" para mirar la tienda como la ve un cliente.",
        "Abajo del menú está tu nombre, tu rol y el botón para cerrar sesión.",
        "En el centro está el contenido de la pantalla elegida.",
      ] },
      { titulo: "Por qué no ves todo", texto: "Cada persona tiene un rol (por ejemplo Vendedor o Encargado) y cada rol puede hacer ciertas cosas. El menú, los botones y esta misma Ayuda solo te muestran lo que tu rol puede usar. Si necesitás algo que no ves, pedíselo a quien administra el sistema." },
      { titulo: "Cosas que se repiten en todas las pantallas", pasos: [
        "Buscador: escribí parte de lo que buscás (un nombre, un código) y la lista se filtra sola. No hace falta escribir todo ni respetar mayúsculas.",
        "Filtros: las listas desplegables de arriba de cada tabla achican la lista (por ejemplo, ver solo los pedidos \"Recibidos\"). \"Limpiar filtros\" vuelve a mostrar todo.",
        "Páginas: las listas largas se dividen en páginas; abajo están los botones para pasar de una a otra.",
        "Guardar: los cambios se guardan recién cuando tocás el botón de guardar de esa pantalla. En la ficha de un artículo, si salís sin guardar, el sistema te pregunta antes de perder los cambios.",
        "Avisos: arriba o abajo de la pantalla aparecen mensajes. Verde = salió bien. Amarillo = prestá atención. Rojo = algo no se pudo hacer, y el mensaje dice por qué.",
        "\"Reintentar\": si se corta internet o el servidor tarda, la pantalla muestra un aviso con ese botón. Tocalo y vuelve a intentar sin perder nada.",
      ] },
      { titulo: "El servidor \"se despierta\"", texto: "Si nadie usó el sistema por un rato, la primera pantalla puede tardar unos segundos en cargar (hasta un minuto). Es normal: esperá y no recargues varias veces." },
      { titulo: "Cómo usar esta Ayuda", pasos: [
        "Buscá arriba con palabras simples, por ejemplo \"precio\", \"bulto\" o \"cobro\".",
        "En casi todas las pantallas hay un botón con un signo de pregunta (?) al lado del título: abre la guía de esa pantalla.",
        "Cada guía tiene un botón \"Ir a la pantalla\" para ir directo a hacer lo que leíste.",
      ] },
      { titulo: "Errores comunes", problemas: [
        { problema: "Me aparece \"No tenés permiso para ver esa pantalla\".", solucion: "Esa pantalla es para otro rol. Si la necesitás para tu trabajo, pedile a quien administra el sistema que le dé ese permiso a tu rol." },
        { problema: "Me sacó del sistema y me pide ingresar de nuevo.", solucion: "Por seguridad, la sesión del equipo dura 24 horas. Volvé a ingresar con tu usuario y contraseña." },
        { problema: "Cambié algo y en la tienda no lo veo.", solucion: "Revisá que hayas tocado \"Guardar\" y recargá la tienda. Si es un artículo, mirá la guía \"Por qué un artículo no aparece en la tienda\"." },
      ] },
    ],
    relacionados: ["panel", "glosario", "dia-a-dia"],
  },
  {
    id: "panel",
    grupo: "Primeros pasos",
    titulo: "El menú y el inicio del panel",
    resumen: "Qué muestra el inicio, cómo se ordena el menú y cómo moverte en la compu y en el celular.",
    palabras: ["menu", "inicio", "resumen", "permiso", "no veo", "pantalla", "celular"],
    reglas: ["PAN-01", "PAN-04", "PAN-10", "PAN-13", "PAN-14", "PAN-20", "PAN-21"],
    secciones: [
      { titulo: "La pantalla de inicio", texto: [
        "Al entrar al panel ves un saludo con tu nombre, un resumen del negocio (por ejemplo, cuántos pedidos hay para atender) y abajo los \"Accesos\": un botón por cada pantalla que podés usar.",
        "Lo que muestra el resumen depende de tu rol: por ejemplo, las ventas del día solo las ve quien tiene permiso para ver ventas.",
      ] },
      { titulo: "El menú de la izquierda", pasos: [
        "Las pantallas están agrupadas con un título (por ejemplo \"Distribuidora\", \"Gestión\" o \"Ayuda\").",
        "La pantalla en la que estás aparece resaltada.",
        "En la compu podés achicar el menú para que muestre solo los íconos (botón arriba del menú). El navegador lo recuerda la próxima vez.",
        "En el celular el menú se abre con el botón ☰ y se cierra solo al elegir una pantalla.",
      ] },
      { titulo: "Errores comunes", problemas: [
        { problema: "Abrí un link y me llevó al inicio con \"No tenés permiso para ver esa pantalla\".", solucion: "Esa pantalla pide un permiso que tu rol no tiene. Si lo necesitás, pedíselo a quien administra Roles y permisos." },
        { problema: "No veo una pantalla que ve un compañero.", solucion: "Cada rol ve cosas distintas. El menú y esta Ayuda se arman con los permisos de tu rol." },
        { problema: "El resumen del inicio dice que no se pudo cargar.", solucion: "Tocá \"Reintentar\". El resto del panel sigue funcionando igual." },
      ] },
    ],
    relacionados: ["bienvenida", "permisos"],
  },
  {
    id: "personal",
    grupo: "Personal y permisos",
    titulo: "Personal: dar de alta y de baja al equipo",
    resumen: "Cómo crear el usuario de alguien del equipo, cambiarle la contraseña o darlo de baja.",
    palabras: ["usuario", "empleado", "contraseña", "clave", "alta", "baja", "vendedor", "nuevo integrante"],
    reglas: ["PER-20", "PER-23", "PER-24", "PER-34", "PER-35", "PER-36"],
    pantalla: "/admin/staffManager",
    secciones: [
      { titulo: "Para qué sirve", texto: "En Personal están las personas del equipo que entran al panel. Cada una tiene su usuario, su contraseña y un rol que dice qué puede hacer. Los clientes de la tienda no aparecen acá." },
      { titulo: "Paso a paso: dar de alta a alguien", pasos: [
        "Entrá a Personal y tocá \"Nuevo integrante\".",
        "Escribí un nombre de usuario (con el que va a ingresar, por ejemplo \"juan.perez\").",
        "Elegí una contraseña de 8 caracteres o más. Después se la pasás a esa persona.",
        "Completá nombre y apellido. El email y el documento son opcionales.",
        "Elegí el rol (por ejemplo Vendedor) y tocá \"Crear integrante\".",
        "Listo: esa persona ya puede ingresar con su usuario (o su email) y la contraseña.",
      ] },
      { titulo: "Si alguien se olvida la contraseña", texto: [
        "Si la persona tiene email cargado, puede recuperarla sola desde la pantalla de ingreso con \"Olvidé mi contraseña\".",
        "Si no tiene email, un administrador le pone una nueva desde Personal.",
      ] },
      { titulo: "Dar de baja", texto: "Dar de baja a alguien hace que no pueda ingresar más y lo saca de la lista. Todo lo que hizo (pedidos que atendió, cobros que registró) se conserva en el historial." },
      { titulo: "Errores comunes", problemas: [
        { problema: "Me dice que el usuario o el email ya existe.", solucion: "Otra persona ya lo usa. Elegí otro nombre de usuario." },
        { problema: "No puedo borrarme a mí mismo.", solucion: "Es a propósito, para que nadie se quede afuera por error: lo tiene que hacer otra persona con permiso." },
      ] },
    ],
    relacionados: ["permisos"],
  },
  {
    id: "permisos",
    grupo: "Personal y permisos",
    titulo: "Roles y permisos",
    resumen: "Qué puede hacer cada rol, cómo crear uno nuevo y qué pasa al quitar un permiso.",
    palabras: ["rol", "acceso", "gerente", "encargado", "vendedor", "supervisor", "nuevo rol"],
    reglas: ["PER-01", "PER-02", "PER-03", "PER-04", "PER-05", "PER-10", "PER-11", "PER-12"],
    pantalla: "/admin/permisos",
    secciones: [
      { titulo: "Qué es un rol y qué es un permiso", texto: [
        "Un permiso es una cosa que se puede hacer: por ejemplo \"Ver pedidos\", \"Cambiar precios\" o \"Registrar cobros\".",
        "Un rol es un grupo de permisos con un nombre: por ejemplo el rol Vendedor tiene \"Ver pedidos\" y \"Cambiar estados\". A cada persona del equipo se le asigna un rol.",
        "El menú, los botones y esta Ayuda se arman con los permisos de tu rol. Además, el sistema lo controla por dentro: aunque alguien intente entrar por otro lado, no puede hacer lo que su rol no permite.",
      ] },
      { titulo: "Qué ves en la pantalla", texto: "Una tabla con los permisos agrupados por tema (Pedidos, Cobros, Catálogo…) y una columna por rol. Cada casilla tildada es un permiso que ese rol tiene." },
      { titulo: "Paso a paso: cambiar lo que puede hacer un rol", pasos: [
        "Entrá a Roles y permisos.",
        "Tildá o destildá las casillas del rol. Si un permiso necesita otro (por ejemplo \"Cambiar estados\" necesita \"Ver pedidos\"), se tilda solo.",
        "Tocá \"Guardar cambios\". El cambio vale enseguida, sin que esas personas tengan que volver a ingresar.",
      ] },
      { titulo: "Paso a paso: crear un rol nuevo", pasos: [
        "Tocá \"Nuevo rol\" y escribí su nombre (de 3 a 40 letras, por ejemplo \"Repositor\").",
        "Tildá sus permisos y guardá.",
        "Asignáselo a las personas desde Personal.",
      ] },
      { titulo: "Bueno saber", pasos: [
        "El Gerente general y el Administrador del sistema tienen todos los permisos siempre: sus casillas no se pueden destildar.",
        "Una pantalla que pide varios permisos se habilita con uno solo, salvo que diga que pide todos (como Importar productos).",
      ] },
      { titulo: "Errores comunes", problemas: [
        { problema: "No me deja borrar un rol.", solucion: "Los roles del sistema no se borran. Uno creado por ustedes solo se borra si no tiene personas asignadas: primero cambiales el rol desde Personal." },
      ] },
    ],
    relacionados: ["personal", "panel"],
  },
  {
    id: "banners",
    grupo: "Primeros pasos",
    titulo: "Banners y promociones de la tienda",
    resumen: "Las imágenes grandes del inicio de la tienda y la cinta de anuncios de arriba, con fecha de inicio y fin.",
    palabras: ["carrusel", "cinta", "promocion", "imagen", "anuncio", "publicidad"],
    reglas: ["SIS-32", "SIS-34"],
    pantalla: "/admin/banners",
    secciones: [
      { titulo: "Para qué sirve", texto: [
        "El carrusel son las imágenes grandes que pasan solas en el inicio de la tienda (por ejemplo, una promo del mes).",
        "La cinta es una franja de texto arriba de todas las páginas de la tienda (por ejemplo, \"Envíos gratis a partir de $50.000\").",
      ] },
      { titulo: "Paso a paso", pasos: [
        "Entrá a Banners y promociones.",
        "Elegí \"Nuevo banner del carrusel\" (con imagen) o \"Nuevo texto de la cinta\".",
        "Subí la imagen o escribí el texto.",
        "Elegí desde qué día y hasta qué día se muestra.",
        "Dejalo activo y guardá.",
      ] },
      { titulo: "Ejemplo", ejemplo: "Una promo de \"Semana del almacén\" del 1 al 7: cargás la imagen con desde = 1 y hasta = 7. El día 8 deja de verse sola, sin que tengas que borrarla." },
      { titulo: "Errores comunes", problemas: [
        { problema: "Lo cargué y no aparece en la tienda.", solucion: "Revisá que esté activo y que hoy esté entre su \"desde\" y su \"hasta\" (hora de Argentina). Recargá la tienda." },
      ] },
    ],
  },
];
