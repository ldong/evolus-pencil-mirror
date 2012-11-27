var ios = Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService);

var CollectionManager = {};
CollectionManager.shapeDefinition = {};
CollectionManager.shapeDefinition.collections = [];
CollectionManager.shapeDefinition.shapeDefMap = {};
CollectionManager.shapeDefinition.shortcutMap = {};

CollectionManager.addShapeDefCollection = function (collection) {
    if (!collection) return;
    CollectionManager.shapeDefinition.collections.push(collection);
    collection.visible = CollectionManager.isCollectionVisible(collection);
    collection.collapsed = CollectionManager.isCollectionCollapsed(collection);

    for (var item in collection.shapeDefs) {
        var shapeDef = collection.shapeDefs[item];
        if (shapeDef.constructor == Shortcut) {
            CollectionManager.shapeDefinition.shortcutMap[shapeDef.id] = shapeDef;
        } else {
            CollectionManager.shapeDefinition.shapeDefMap[shapeDef.id] = shapeDef;
        }
    }
};
CollectionManager.shapeDefinition.locateDefinition = function (shapeDefId) {
    return CollectionManager.shapeDefinition.shapeDefMap[shapeDefId];
};
CollectionManager.shapeDefinition.locateShortcut = function (shortcutId) {
    return CollectionManager.shapeDefinition.shortcutMap[shortcutId];
};
CollectionManager.loadUserDefinedStencils = function () {
    try {
        var stencilDir = CollectionManager.getUserStencilDirectory();
        debug("Loading optional stencils in: " + stencilDir.path);
        CollectionManager._loadUserDefinedStencilsIn(stencilDir);
    } catch (e) {
        Console.dumpError(e);
    }
};
CollectionManager.getUserStencilDirectory = function () {
    return CollectionManager.getSpecialDirs("ProfD", "Pencil/Stencils");
};
CollectionManager.getSpecialDirs = function (id, subFolders) {
    var properties = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties);

    var stencilDir = properties.get(id, Components.interfaces.nsIFile);
    var subs = subFolders.split(/\//);
    for (var i = 0; i < subs.length; i ++) {
        stencilDir.append(subs[i]);
    }

    return stencilDir;
};
CollectionManager._loadDeveloperStencil = function () {
	try {
		var path = Config.get("dev.stencil.path", "null");
		if (!path || path == "none" || path == "null") {
			Config.set("dev.stencil.path", "none");
		} else {
			var file = Components.classes["@mozilla.org/file/local;1"].
		    createInstance(Components.interfaces.nsILocalFile);
			file.initWithPath(path);
			
			if (!file.exists()) return;
			
			var parser = new ShapeDefCollectionParser();
			CollectionManager._loadStencil(file, parser, "isSystem");
		}
		
	} catch (e) {
        Util.error("Failed to load developer stencil", ex.message + "\n" + definitionFile.path, Util.getMessage("button.cancel.close"));
	}
	
	try {
		var path = Config.get("dev.stencil.dir", "null");
		if (!path || path == "none" || path == "null") {
			Config.set("dev.stencil.dir", "none");
		} else {
			var file = Components.classes["@mozilla.org/file/local;1"].
		    createInstance(Components.interfaces.nsILocalFile);
			file.initWithPath(path);
			
			if (!file.exists()) return;
			
			CollectionManager._loadUserDefinedStencilsIn(file, null, "isSystem");
		}
	} catch (e) {
        Util.error("Failed to load developer stencil", ex.message + "\n" + definitionFile.path, Util.getMessage("button.cancel.close"));
	}
};
CollectionManager._loadStencil = function (dir, parser, isSystem) {
	var definitionFile = dir;
	definitionFile.append("Definition.xml");
    if (!definitionFile.exists() || definitionFile.isDirectory()) return;

    var uri = ios.newFileURI(definitionFile);

    try {
        var collection = parser.parseFile(definitionFile, uri.spec);
        collection.userDefined = isSystem ? false : true;
        collection.installDirPath = definitionFile.parent.path;
        CollectionManager.addShapeDefCollection(collection);
    } catch (ex) {
        Util.error(Util.getMessage("error.title"), Util.getMessage("stencil.cannot.be.parsed", definitionFile.path, ex.message), Util.getMessage("button.cancel.close"))
        //alert("Warning:\nThe stencil at: " + definitionFile.path + " cannot be parsed.\nError: " + ex.message);
    }
};
CollectionManager._loadUserDefinedStencilsIn = function (stencilDir, excluded, isSystem) {
    debug("Loading stencils in: " + stencilDir.path + "\n excluded: " + excluded);

    var parser = new ShapeDefCollectionParser();

    //loading all stencils
    try {
        if (!stencilDir.exists() || !stencilDir.isDirectory()) return;
        var entries = stencilDir.directoryEntries;
        while(entries.hasMoreElements())
        {
            var definitionFile = entries.getNext();
            definitionFile.QueryInterface(Components.interfaces.nsIFile);
            if (excluded && excluded.indexOf(definitionFile.leafName) >= 0) {
                continue;
            }
            
            CollectionManager._loadStencil(definitionFile, parser, isSystem ? true : false);
        }
    } catch (e) {
        Console.dumpError(e);
    }
};

CollectionManager.loadStencils = function() {
    CollectionManager.shapeDefinition.collections = [];
    CollectionManager.shapeDefinition.shapeDefMap = { };

    //load all system stencils
    var parser = new ShapeDefCollectionParser();
    CollectionManager.addShapeDefCollection(parser.parseURL("chrome://pencil/content/stencil/Common/Definition.xml"));
    CollectionManager.addShapeDefCollection(parser.parseURL("chrome://pencil/content/stencil/Annotation/Definition.xml"));
    CollectionManager.addShapeDefCollection(parser.parseURL("chrome://pencil/content/stencil/BasicWebElements/Definition.xml"));
    CollectionManager.addShapeDefCollection(parser.parseURL("chrome://pencil/content/stencil/SketchyGUI/Definition.xml"));

    CollectionManager.addShapeDefCollection(parser.parseURL("chrome://pencil/content/stencil/Gtk.GUI/Definition.xml"));
    CollectionManager.addShapeDefCollection(parser.parseURL("chrome://pencil/content/stencil/WindowsXP-GUI/Definition.xml"));
    CollectionManager.addShapeDefCollection(parser.parseURL("chrome://pencil/content/stencil/Native.GUI/Definition.xml"));
        
    if (navigator.userAgent.indexOf("Firefox") < 0) {
        CollectionManager._loadUserDefinedStencilsIn(CollectionManager.getSpecialDirs("CurProcD", "content/pencil/stencil"),
        "Common, Annotation, BasicWebElements, SketchyGUI, Gtk.GUI, WindowsXP-GUI, Native.GUI", "isSystem");
    }

    //CollectionManager.addShapeDefCollection(parser.parseURL("chrome://pencil/content/stencil/iPhone/Definition.xml"));

    CollectionManager._loadUserDefinedStencilsIn(CollectionManager.getSpecialDirs("ProfD", "Pencil/Stencils"));
    CollectionManager.shapeDefinition.collections = CollectionManager.shapeDefinition.collections.sort(function (a, b) {
    	if (a.id == "Evolus.Common") return -1;
    	return a.displayName > b.displayName ? 1 : (a.displayName < b.displayName ? -1 : 0);
    });
    CollectionManager._loadDeveloperStencil();
    
    PrivateCollectionManager.loadPrivateCollections();

    Pencil.collectionPane.reloadCollections();
    Pencil.privateCollectionPane.reloadCollections();
};
CollectionManager.installNewCollection = function () {
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, Util.getMessage("filepicker.open.document"), nsIFilePicker.modeOpen);
    fp.appendFilter(Util.getMessage("filepicker.pencil.collection.archives"), "*.epc; *.zip");
    fp.appendFilter(Util.getMessage("filepicker.all.files"), "*");

    if (fp.show() != nsIFilePicker.returnOK) return;

    CollectionManager.installCollectionFromFile(fp.file);
}
CollectionManager.installCollectionFromFile = function (file) {
    var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
                   .createInstance(Components.interfaces.nsIZipReader);
    zipReader.open(file);

    var targetDir = CollectionManager.getUserStencilDirectory();
    //generate a random number
    targetDir.append(file.leafName.replace(/\.[^\.]+$/, "") + "_" + Math.ceil(Math.random() * 1000) + "_" + (new Date().getTime()));

    var targetPath = targetDir.path;

    var isWindows = true;
    if (navigator.platform.indexOf("Windows") < 0) {
        isWindows = false;
    }

    var entryEnum = zipReader.findEntries(null);
    while (entryEnum.hasMore()) {
        var entry = entryEnum.getNext();

        var targetFile = Components.classes["@mozilla.org/file/local;1"]
                   .createInstance(Components.interfaces.nsILocalFile);
        targetFile.initWithPath(targetPath);

        debug(entry);
        if (zipReader.getEntry(entry).isDirectory) continue;

        var parts = entry.split("\\");
        if (parts.length == 1) {
            parts = entry.split("/");
        } else {
            var testParts = entry.split("/");
            if (testParts.lenth > 1) {
                debug("unregconized entry (bad name): " + entry);
                continue;
            }
        }
        for (var i = 0; i < parts.length; i ++) {
            targetFile.append(parts[i]);
        }

        debug("Extracting '" + entry + "' --> " + targetFile.path + "...");

        var parentDir = targetFile.parent;
        if (!parentDir.exists()) {
            parentDir.create(parentDir.DIRECTORY_TYPE, 0777);
        }
        zipReader.extract(entry, targetFile);
        targetFile.permissions = 0600;
    }
    var extractedDir = Components.classes["@mozilla.org/file/local;1"]
                   .createInstance(Components.interfaces.nsILocalFile);

    extractedDir.initWithPath(targetPath);

    //try loading the collection
    try {
        var definitionFile = Components.classes["@mozilla.org/file/local;1"]
                       .createInstance(Components.interfaces.nsILocalFile);

        definitionFile.initWithPath(targetPath);
        definitionFile.append("Definition.xml");

        if (!definitionFile.exists()) throw Util.getMessage("collection.specification.is.not.found.in.the.archive");

        var uri = ios.newFileURI(definitionFile);

        var parser = new ShapeDefCollectionParser();
        var collection = parser.parseFile(definitionFile, uri.spec);

        if (collection && collection.id) {
            //check for duplicate of name
            for (i in CollectionManager.shapeDefinition.collections) {
                var existingCollection = CollectionManager.shapeDefinition.collections[i];
                if (existingCollection.id == collection.id) {
                    throw Util.getMessage("collection.named.already.installed", collection.id);
                }
            }
            collection.userDefined = true;
            if (!Util.confirmWithWarning(Util.getMessage("install.the.unsigned.collection.confirm", collection.displayName),
                                         new RichText(Util.getMessage("install.the.unsigned.collection.discription")), Util.getMessage("button.install.label"))) {
                extractedDir.remove(true);
                return;
            }

            CollectionManager.setCollectionVisible(collection, true);
            CollectionManager.setCollectionCollapsed(collection, false);

            CollectionManager.addShapeDefCollection(collection);
            CollectionManager.loadStencils();
        } else {
            throw Util.getMessage("collection.specification.is.not.found.in.the.archive");
        }
    } catch (e) {
        Util.error(Util.getMessage("error.installing.collection"), e.message, Util.getMessage("button.close.label"));
        //removing the extracted dir
        extractedDir.remove(true);
        return;
    }
};
CollectionManager.installCollectionFromFilePath = function (filePath) {
    var file = Components.classes["@mozilla.org/file/local;1"]
                   .createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(filePath);

    CollectionManager.installCollectionFromFile(file);
};
CollectionManager.installCollectionFromUrl = function (url) {
    Net.downloadAsync(url, "e:\\t.txt", {
        onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
            var percentComplete = (aCurTotalProgress/aMaxTotalProgress)*100;
            Util.showStatusBarInfo(percentComplete + "%");
        },
        onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
            // do something
        }
    });
    //CollectionManager.installCollectionFromFile(file);
};
CollectionManager.setCollectionVisible = function (collection, visible) {
    collection.visible = visible;
    Config.set("Collection." + collection.id + ".visible", visible);
};
CollectionManager.isCollectionVisible = function (collection) {
    var visible = Config.get("Collection." + collection.id + ".visible");
    if (visible == null) visible = true;
    return visible;
};
CollectionManager.setCollectionCollapsed = function (collection, collapsed) {
    collection.collapsed = collapsed;
    Config.set("Collection." + collection.id + ".collapsed", collapsed);
};
CollectionManager.isCollectionCollapsed = function (collection) {
    var collapsed = Config.get("Collection." + collection.id + ".collapsed");
    if (collapsed == null) collapsed = false;
    return collapsed;
};
CollectionManager.uninstallCollection = function (collection) {
    if (!collection.installDirPath || !collection.userDefined) return;
    if (!Util.confirm(Util.getMessage("uninstall.the.collection.confirm", collection.displayName),
                      Util.getMessage("uninstall.the.collection.discription", collection.displayName))) return;
    var dir = Components.classes["@mozilla.org/file/local;1"]
                   .createInstance(Components.interfaces.nsILocalFile);
    dir.initWithPath(collection.installDirPath);

    dir.remove(true);
    CollectionManager.loadStencils();
}
