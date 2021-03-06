global.Panes.Query = global.Pane.extend({
  renderTab: function(rows) {
    if (this.content) return;

    this.renderViewToPane('query', 'query_tab');

    this.button = this.content.find('button:first');
    this.cleanButton = this.content.find('button.cleanButton');

    this.mime = 'text/x-pgsql';
    this.textarea = this.content.find('textarea.editor');

    this.editor = window.CodeMirror.fromTextArea(this.textarea[0], {
      mode: this.mime,
      indentWithTabs: false,
      smartIndent: true,
      lineNumbers: true,
      matchBrackets: true,
      hint: window.CodeMirror.hint.sql,
      autofocus: true,
      styleActiveLine: true,
      tabSize: 2,
      scrollbarStyle: 'null',
      theme: 'mac-classic',
      extraKeys: {"Esc": "autocomplete"}
    });

    if (Model.LastQuery.load()) {
      this.editor.setValue(Model.LastQuery.load());
    }

    this.editor.on("cursorActivity", this.toggleButtonText.bind(this));
    this.editor.on("change", this.saveLastQuery.bind(this));

    this.editor.focus();

    this.setUnchangeable();
    this.statusLine = this.content.find('.result .status');

    new QueryTabResizer(this.content, this.editor);
  },

  saveLastQuery: function () {
    var value = this.editor.getValue();
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      Model.LastQuery.save(value);
      delete this.saveTimeout;
    }, 700);

  },

  toggleButtonText: function () {
    var runLabel = "Run query";
    var selectedLabel = "Run selection";

    var selectedText = this.editor.getSelection();
    if (selectedText && selectedText != "") {
      this.button.text(selectedLabel);
    } else {
      this.button.text(runLabel);
    }
  },

  toggleCleanButton: function () {
    if (this.content.find('.result table tr').length) {
      this.cleanButton.show();
    } else {
      this.cleanButton.hide();
    }
  },

  runQuery: function () {
    this.editor.save();
    this.statusLine.text('');

    if (!this.handler.connection.connection) {
      window.alertify.confirm("Not connected to server, reconnect?", (is_yes) => {
        if (is_yes) {
          this.handler.reconnect((success) => {
            if (success) this.runQuery();
          });
        }
      });
      return;
    }

    var selectedText = this.editor.getSelection();

    var sql = selectedText || this.textarea.val();
    var tableRegex = /(create|drop)\s+(OR REPLACE\s+)?((GLOBAL|LOCAL|TEMPORARY|TEMP|UNLOGGED|FOREIGN|MATERIALIZED)\s+)*\s*(table|schema|view)/im;
    var needReloadTables = !!sql.match(tableRegex);

    this.button.text("Running...");

    App.startLoading("Query still running...", 3000, {
      cancel: function () {
        App.stopRunningQuery();
      }
    });

    this.handler.connection.query(sql, (data, error) => {
      this.toggleButtonText();
      App.stopLoading();
      if (error) {
        this.cleanResult();
        var message = error.message;
        if (message == "invalid message format") message += ". It can be if too many records, try add 'limit'";
        this.statusLine.text(message);
      } else {
        PgTypeNames.extendFields(data);
        if (data.rows.length > 500) {
          data.rows.length = 500;
        }
        var node = App.renderView('db_rows_table', {data: data})[0];
        $u(node).addClass('command_' + data.command);
        this.content.find('.result .rescol-wrapper').replaceWith(node);

        var footerText;
        if (data.fields && !isNaN(data.rowCount) || data.command == "SELECT") {
          footerText = `Found ${data.rowCount} ${data.rowCount > 1 ? 'rows' : 'row'} in ${data.time} ms.`;
          if (data.rowCount > 500) {
            footerText += " Shown first 500 records";
          }
        } else {
          footerText = `Complete, taking ${data.time} ms.`;
          if (data.rowCount) {
            footerText += ` Affected ${data.rowCount} ${data.rowCount > 1 ? 'rows' : 'row'}`;
          }
        }
        this.statusLine.text(footerText);
        this.initTables();
        if (data.command == "EXPLAIN") {
          this.content.find('.result .rescol-wrapper').css('width', '');
        }
      }
      this.toggleCleanButton();
      if (needReloadTables) {
        this.reloadTables();
      }
      this.editor.focus();
    });
  },

  cleanResult: function () {
    this.content.find('.result .rescol-wrapper').html("").hide();
    this.statusLine.text("");
  },

  cleanButtonClick: function () {
    this.cleanResult();
    this.toggleCleanButton();
  },

  reloadTables: function () {
    this.handler.fetchTablesAndSchemas();
  },

  appendText: function (sql, lineOffset) {
    if (lineOffset == undefined) lineOffset = 1;

    var lineNo = this.editor.lineCount();
    this.editor.setValue(this.editor.getValue() + sql);
    this.editor.setCursor(lineNo + lineOffset, 0);
    this.editor.focus();
  },

  openSnippets: function () {
    SnippetsWindow.init();
  },

  showHistory: function () {
    global.HistoryWindow.init();
  }
});
