require "../../lib/psql_runner"
require "../../lib/sql_importer"

describe('SqlRunner', do

  bdd.after(do |done|
    DbCleaner(connection).recreateSchema(done);
  end)

  sync_it("should import world database", do |done|
    var thisDir = node.path.dirname(module.filename);
    var worldDbPath = node.path.resolve(thisDir, "../../vendor/datasets/world.sql");

    var importer = new SqlImporter(worldDbPath, {debug: false});

    var onMessageCount = 0;
    var importerOutput = "";

    importer.onMessage(do |message, is_good|
      onMessageCount += 1;
      importerOutput += message;
      if !is_good
        console.log("IMPORT ERROR:" + message);
      end
    end)

    var success = importer.doImport(global.connection)

    assert(success, true);
    //assert(onMessageCount, 17);

    var tables = Model.Table.publicTables();
    assert(tables, ['city', 'country', 'countrylanguage']);

    //DbCleaner(connection).fibRecreateSchema();
  end)

  sync_it("should import booktown database", do |done|
    var thisDir = node.path.dirname(module.filename);
    var worldDbPath = node.path.resolve(thisDir, "../../vendor/datasets/booktown.sql");

    var importer = new SqlImporter(worldDbPath, {debug: false});

    var onMessageCount = 0;
    var importerOutput = "";

    importer.onMessage(do |message, is_good|
      onMessageCount += 1;
      importerOutput += message;
      #if !is_good
      #  console.log("IMPORT ERROR:" + message);
      #end
    end)

    var success = importer.doImport(global.connection)
    assert(success, true);

    //assert(onMessageCount, 101);

    var tables = Model.Table.publicTables();
    assert(tables, ['states', 'my_list', 'employees', 'schedules', 'editions',
                    'books', 'publishers', 'shipments', 'stock', 'numeric_values',
                    'daily_inventory', 'money_example', 'customers', 'book_queue',
                    'stock_backup', 'stock_view', 'favorite_books', 'subjects',
                    'distinguished_authors', 'favorite_authors', 'text_sorting',
                    'alternate_stock', 'book_backup', 'recent_shipments', 'authors',
                   ]);

    //DbCleaner(connection).fibRecreateSchema();
  end)

end)
