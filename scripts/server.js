#!/usr/bin/env node
const net = require('net')
const passwdUser = require('passwd-user');
const mycnf = require('mycnf');
const mysql = require('mysql');

// parse any arguments
const argv = require('minimist')(process.argv.slice(2))

const SERVER_PORT = argv.port ? parseInt(argv.port) : 2048
const SERVER_ADDR = argv.host ? argv.host.replace(/['"]+/g, '') : '127.0.0.1'
const DEBUG = true
const MYSQL = mycnf()

function local_debug(msg) {
  if (DEBUG) {
    console.debug(msg)
  }
}

function novoRegistroUsuario(id) {
  // Conectar ao Banco de Dados
  const param = {
    host: 'localhost',
    user: MYSQL.user,
    password: MYSQL.password,
    database: 'root_cwp',
    port: 3306
  }
  local_debug("Connection Params: " + param)
  const con = mysql.createConnection(param)
  con.connect((err) => {
    if (err) {
      console.error(err)
      con.destroy()
    } else {
      let sql = 'SELECT username FROM user WHERE id = ?'
      local_debug('SQL: ' + sql + ' PARAMS: ' + id)
      con.query(sql, [id], (err, result) => {
        if (err) {
          console.error(err)
          con.destroy()
        } else if (result.length > 0) {
          local_debug(result)
          passwdUser(result[0].username).then((u) => {
            local_debug(u)
            let sql = 'UPDATE user SET uid = ?'
            local_debug(sql)
            con.query(sql, [u.userIdentifier], (err) => {
              if (err) {
                console.error(err)
              } else {
                console.log('User Id do usuário ' + u.username + ' foi configurado com SUCESSO!')
              }
              con.destroy()
            })
          }).
          catch((err) => {
            console.error(err)
            con.destroy()
          })
        } else {
          console.error('Erro: Query consultada não retornou resultados')
          con.destroy()
        }
      })
    }
  });
}

function trataMensagem(id, tipo) {
  // Recebe o ID da tabela `root_cwp.user` e o TIPO da transação
  switch (tipo) {
    // UPDATE
    case 2:
      console.warn("trataMensagem: Ação de UPDATE não foi implementada!")
      break;
    // INSERT
    case 3:
      novoRegistroUsuario(id);
      break;
    // DELETE
    case 4:
      console.warn("trataMensagem: Ação de DELETE não foi implementada!")
      break;

    default:
      console.error("ERRO: ID '" + id + "' e TYPE '" + tipo + "' informado não é reconhecido!");
      break;
  }
}

// create a listening socket
net.createServer((sock) => {
  sock.on('data', (data) => {
    sock.end()
    sock.destroy()
    try {
      let msg = JSON.parse(String(data));
      if (DEBUG) {
        console.debug(JSON.stringify(msg));
      }

      if (typeof msg.id !== "undefined" && typeof msg.type !== "undefined") {
        trataMensagem(msg.id, msg.type)
      }
    } catch (e) {
      console.error(e)
    }
  })
  // eslint-disable-next-line no-unused-vars
  sock.on('close', (data) => {
  })
}).listen(SERVER_PORT, SERVER_ADDR)

console.info((new Date()) + ' Serviço inicializado')

// Também posso fazer uma API pra gerar o SSL para o e-mail