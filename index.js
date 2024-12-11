import { neon } from '@neondatabase/serverless';
import { engine } from 'express-handlebars';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import express from 'express';
import session from 'express-session';

const CLAVE_SECRETA = 'calvesupersecreta123';
const AUTH_COOKIE_NAME = 'seguridad';

const sql = neon(
  'postgresql://neondb_owner:W1arCeJNZgu6@ep-cold-lake-a5gessa1.us-east-2.aws.neon.tech/neondb?sslmode=require'
);

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');


app.use('/file', express.static('public'));


app.get('/home', (req, res) => {
  res.render('home');
});

// entrar a agregar producto
app.get('/agregar/producto', (req, res) => {
  res.render('agregarproducto');
});

//agregar producto
app.post('/productos', async (req, res) => {
  const codigo_proveedor = req.body.codigo_proveedor;
  const id_oferta = req.body.id_oferta;
  const sexo = req.body.sexo;
  const precio = req.body.precio;
  const query = `INSERT INTO producto (codigo_proveedor, id_oferta, sexo, precio) VALUES ($1, $2, $3, $4)`;
  await sql(query, [codigo_proveedor, id_oferta, sexo, precio]);
  res.redirect('/');
});


//render productos en home
app.get('/', async (req, res) => {
  const listado = await sql('SELECT * FROM producto');
  res.render('home', { listado });
});

//render productos en editar productos
app.get('/editar/productos', async (req, res) => {
  
    const query = `SELECT 
    p.id AS id, 
    p.precio,
    p.sexo, 
    i.cantidad AS stock 
  FROM producto p 
  JOIN pertenece pt ON p.id = pt.id_producto 
  JOIN inventario i ON pt.id_inventario = i.id`;
    const productos = await sql(query);
    const respuesta = null;
    res.render('editarproductos', { productos, respuesta });
});

// Ruta para mostrar el formulario de edición de productos
app.get('/editarformulario', async (req, res) => {
  const {respuesta} = req.query;
  const result = await sql('SELECT * FROM producto WHERE id = $1', [respuesta]);
  
  const producto = result[0];

  res.render('editarformulario',  producto );
});

//actualizar los datos del producto
app.post('/productos/:id/editar', async (req, res) => {
  const { nombre, precio, genero, colores, tipo_prenda, imagen } = req.body;
  const id = req.params.id;
  console.log(`ID del producto a actualizar: ${id}`);
  
  const query = `
    UPDATE producto
    SET nombre = $1, precio = $2, genero = $3, colores = $4, tipo_prenda = $5, url = $6
    WHERE id = $7
  `;
  const values = [nombre, precio, genero, colores, tipo_prenda, imagen, id];

  try {
    const result = await sql(query, values);
    console.log("Producto actualizado con éxito");

    res.redirect('/editarproductos');
  } catch (error) {
    console.error("Error actualizando el producto:", error);
    res.status(500).send("Error actualizando el producto");
  }
});



//edits de bases

// proveedores
app.get('/proveedores', async (req, res) => {

  const query = 'SELECT * FROM proveedores';
  const productos = await sql(query);
  const respuesta = null;
  res.render('proveedores', { productos, respuesta });
});

//formulario de edicion de proveedores
app.get('/editarformprov', async (req, res) => {
  const {respuesta} = req.query;
  const result = await sql('SELECT * FROM proveedores WHERE codigo = $1', [respuesta]);
  
  const producto = result[0];

  
  res.render('editarformprov',  producto );
});

//editar proveedor
app.post('/proveedores/:codigo/editar', async (req, res) => {
  const { infocontacto, pedidos_entregados } = req.body;
  const codigo = req.params.codigo;

  console.log(`ID del proveedor a actualizar: ${codigo}`);

  if (!infocontacto || !pedidos_entregados) {
    return res.status(400).send("Faltan datos requeridos para actualizar.");
  }

  const query = `
    UPDATE proveedores
    SET infocontacto = $1, pedidos_entregados = $2
    WHERE codigo = $3
  `;
  const values = [infocontacto, pedidos_entregados, codigo];

  try {
    const result = await sql(query, values);

    if (result.rowCount === 0) {
      return res.status(404).send("Proveedor no encontrado.");
    }

    console.log("Proveedor actualizado con éxito");
    res.redirect('/proveedores');
  } catch (error) {
    console.error("Error actualizando el proveedor:", error);
    res.status(500).send("Error actualizando el proveedor");
  }
});


//entrar a fromulario agregar proveedor
app.get('/agregar/proveedor', (req, res) => {
  res.render('agregarproveedor');
});

//agregar proveedor
app.post('/proveedor', async (req, res) => {
  
  const pedidos_entregados = req.body.pedidos_entregados;
  const infocontacto = req.body.infocontacto;
  const query = `INSERT INTO proveedores (pedidos_entregados, infocontacto) VALUES ($1, $2)`;
  await sql(query, [pedidos_entregados, infocontacto]);
  res.redirect('/proveedores');
});

//compras y ventas
app.get('/compras/ventas', async (req, res) => {
  const query = 'SELECT * FROM compras_ventas';
  const ventas = await sql(query);
  const respuesta = null;
  const result = await sql(`SELECT SUM(total) AS total FROM compras_ventas`);
  const ventastotales = result[0].total; 
  const vpromedio = await sql(`SELECT AVG(total) AS promedio
  FROM compras_ventas
  WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE)`);
  const pr = vpromedio[0].promedio;
  res.render('compras_ventas', { ventas, respuesta, ventastotales, pr });
});

//renderizar empleados
app.get('/empleados', async (req, res) => {

  const query = 'SELECT * FROM Empleado';
  const productos = await sql(query);
  const respuesta = null;
  res.render('empleados', { productos, respuesta });
});

// entrar a agregar producto
app.get('/agregar/empleado', (req, res) => {
  res.render('agregarempleado');
});

//agregar empleado
app.post('/empleado', async (req, res) => {
  
  const rut = req.body.rut;
  const tienda = req.body.tienda;
  const nombre = req.body.nombre;
  const horas = req.body.horas;
  const ventas = req.body.ventas;

  const query = `INSERT INTO empleado (rut, id_tienda, nombre, horas, ventas) VALUES ($1, $2, $3, $4, $5)`;
  await sql(query, [rut, tienda, nombre, horas, ventas]);
  res.redirect('/empleados');
});

// editar empleados
app.get('/editarEmpleados', async (req, res) => {
  const {respuesta} = req.query;
  const result = await sql(`SELECT * FROM Empleado WHERE rut = $1`, [respuesta]);

  const empleado = result[0];


  res.render('editarEmpleados',  empleado );
});

//editar empleados
app.post('/empleados/:rut/editar', async (req, res) => {
  const { id_tienda, horas, ventas } = req.body;
  const rut = req.params.rut;


  if (!id_tienda || !horas || !ventas) {
    return res.status(400).send("Faltan datos requeridos para actualizar.");
  }

  const query = 
  `UPDATE Empleado
    SET id_tienda = $1, horas = $2, ventas = $3
    WHERE rut = $4`
  ;
  const values = [id_tienda, horas, ventas, rut];

  try {
    const result = await sql(query, values);

    if (result.rowCount === 0) {
      return res.status(404).send("Proveedor no encontrado.");
    }

    console.log("Proveedor actualizado con éxito");
    res.redirect('/empleados');
  } catch (error) {
    console.error("Error actualizando el proveedor:", error);
    res.status(500).send("Error actualizando el proveedor");
  }
});

//Eliminar empeleado
app.post('/eliminar/:rut',  async (req, res) => {
  const empleadorut = req.params.rut;
  console.log("Intentando eliminar el empleado con rut", empleadorut);
  try {
    await sql('DELETE FROM empleado WHERE rut=$1', [empleadorut]);
    res.redirect('/empleados');
  } catch (error) {
    console.error("Error al eliminar el empleado con rut:", error);
    res.status(500).send('Error al eliminar el producto del carrito');
  }
});

//eliminar producto
app.post('/eliminarpr/:rut',  async (req, res) => {
  const empleadorut = req.params.rut;
  console.log("Intentando eliminar el empleado con rut", empleadorut);
  try {
    await sql('DELETE FROM producto WHERE id=$1', [empleadorut]);
    res.redirect('/');
  } catch (error) {
    console.error("Error al eliminar el empleado con rut:", error);
    res.status(500).send('Error al eliminar el producto del carrito');
  }
});




//--------------------------------------------




//vicho edits
//inventario
app.get('/inventario', async (req, res) => {

  const query = 'SELECT * FROM inventario';
  const inventario = await sql(query);
  const respuesta = null;
  res.render('inventario', { inventario, respuesta });
});

//editar inventario
app.get('/editarInventario', async (req, res) => {
  const {respuesta} = req.query;
  const result = await sql('SELECT * FROM inventario WHERE id = $1', [respuesta]);
  
  const empleado = result[0];

  
  res.render('editarInventario',  empleado );
});

//editar inventario por id
app.post('/inventario/:id/editar', async (req, res) => {
  const { cantidad, categoria } = req.body;
  const id = req.params.id;

  console.log(`ID del proveedor a actualizar: ${id}`);

  if (!cantidad || !categoria) {
    return res.status(400).send("Faltan datos requeridos para actualizar.");
  }

  const query = `
    UPDATE inventario
    SET cantidad = $1, categoria = $2
    WHERE id = $3
  `;
  const values = [cantidad, categoria, id];

  try {
    const result = await sql(query, values);

    if (result.rowCount === 0) {
      return res.status(404).send("Proveedor no encontrado.");
    }

    console.log("Proveedor actualizado con Ã©xito");
    res.redirect('/home');
  } catch (error) {
    console.error("Error actualizando el proveedor:", error);
    res.status(500).send("Error actualizando el proveedor");
  }
});


//------------------------------------------
// tomi edits
app.get('/admin', async (req, res) => {
  const query = `SELECT COUNT(DISTINCT rut_clientes) AS clientes_unicos
  FROM compras_ventas
  WHERE fecha >= CURRENT_DATE -30`;
  const clientes = await sql(query);
  const clientesunicos = clientes[0].clientes_unicos;
  const oferta = await sql(`SELECT id, descuento, estado 
  FROM ofertas
  WHERE estado = 'Activa'`);
  const ofertas = oferta
  let ofertasActivas = [];
    if (ofertas.length > 0) {
        ofertasActivas = ofertas;
    } else {
        ofertasActivas = [{ id: "N/A", descuento: "N/A", estado: "Sin ofertas activas" }];
    }
  let empleadogood = "";
  const vendedor = await sql(`SELECT e.nombre AS nombre, COUNT(cv.id) AS ventas_realizadas
  FROM empleado e
  JOIN tienda t ON e.id_tienda = t.id
  JOIN ofertas o ON o.id_tienda = t.id
  JOIN producto p ON p.id_oferta = o.id
  JOIN contiene c ON c.id_producto = p.id
  JOIN compras_ventas cv ON cv.id = c.id_compra
  WHERE cv.fecha >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY nombre
  ORDER BY ventas_realizadas DESC 
  LIMIT 1`);
  if (vendedor.length === 0) {
   empleadogood = "Sin datos disponibles";
} else {
   empleadogood = vendedor[0].nombre;
}
  const prenda = await sql(`SELECT p.id AS id_producto, COUNT(c.id_compra) AS total_vendido
  FROM producto p
  JOIN contiene c ON p.id = c.id_producto
  GROUP BY p.id
  ORDER BY total_vendido DESC
  LIMIT 1`);

  const balance = await sql(`SELECT SUM(cv.total - precio * c.cantidad ) AS margen_ganancia
  FROM compras_ventas cv
  JOIN contiene c ON cv.id = c.id_compra
  JOIN producto p ON c.id_producto = p.id`);
  const balancetotal = balance[0].margen_ganancia;
  const prendav = prenda[0].id_producto;

  const ocasiones = await sql(`SELECT COUNT (*) AS clientes_frecuentes
FROM ( SELECT rut_clientes, COUNT (*) AS compras_realzadas
FROM compras_ventas
GROUP BY rut_clientes
HAVING COUNT (*) >= 3
) AS subquery`);
const cliente = ocasiones.clientes_frecuentes;

const genero = await sql(`SELECT sexo, COUNT(c.id_compra) AS cantidad_vendida
FROM producto p
JOIN contiene c ON p.id = c.id_producto
GROUP BY p.sexo
ORDER BY cantidad_vendida DESC
LIMIT 1`);
let vgenero = genero[0].sexo;

const produc = await sql(`SELECT id AS id_producto, precio
  FROM producto
  ORDER BY precio DESC
  LIMIT 1`);
  const productomascaro = produc[0].precio;

  const extras = await sql(`SELECT COUNT(*) AS empleados_extras
FROM empleado
WHERE horas > 45`);
const horasextras = extras[0].empleados_extras;

const mayor = await sql(`SELECT cv.rut_clientes, SUM (cv.total) AS total_invertido
FROM compras_ventas cv
GROUP BY cv.rut_clientes
ORDER BY total_invertido DESC
LIMIT 1`);
const mayordinero = mayor[0].rut_clientes;

  res.render('admin', { clientesunicos, balancetotal, vgenero, ofertasActivas,
     cliente, empleadogood, prendav, productomascaro, horasextras, mayordinero});
});



app.listen(3000, () => console.log('whatashop'));
