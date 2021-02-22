/* Copyright � 2012-2017 erwin, Inc. - All rights reserved */
/*global cwAPI, jQuery*/

(function (cwApi, $) {
  "use strict";
  var cwLayoutFilteredListBox;

  cwLayoutFilteredListBox = function (options, viewSchema) {
    cwApi.extend(this, cwApi.cwLayouts.CwLayout, options, viewSchema);
    this.drawOneMethod = cwApi.cwLayouts.cwLayoutList.drawOne.bind(this);
    cwApi.registerLayoutForJSActions(this);

    this.firstNodeId = this.options.CustomOptions["view-root-nodeid"];
    this.secondNodeId = this.options.CustomOptions["selection-data-nodeid"];
    this.targetObjectTypeScriptName = this.mmNode.ObjectTypeScriptName;
    this.targetViewName = this.options.CustomOptions["filtered-view"];
    this.dataViewName = this.options.CustomOptions["data-view"];
    this.filterLabel = this.options.CustomOptions["filtered-ddl-label"];
    this.dataLabel = this.options.CustomOptions["selection-ddl-label"];
    this.create_objectpage_name = this.options.CustomOptions["creation_page"];
    if (cwAPI.ViewSchemaManager.pageExists(this.create_objectpage_name) === true) this.creationPage = true;
    this.alreadyAssociatedItems = {};
    this.itemsById = {};
    this.loadedItems = {};
    this.secondLoadedItems = {};
    this.loadingInProgress = {};
    this.waitingForUpdates = {};
  };

  cwLayoutFilteredListBox.prototype.appendAssociationSelect = function (output, nodeId, objectId) {
    if (cwApi.cwEditProperties.canAddAssociationInput(nodeId)) {
      output.push('<div class="cw-property-details-association">');
      if (this.filterLabel !== "") {
        output.push(
          '<p class="cw-hidden cw-edit-mode"><label id="cw-edit-mode-',
          nodeId,
          "-",
          objectId,
          '-filterlabel">',
          this.filterLabel,
          "</label>&nbsp;&nbsp;",
          '<select id="cw-edit-mode-autocomplete-',
          nodeId,
          "-",
          objectId,
          '-filterddl" disabled="disabled" class="cw-hidden chosen-select cw-edit-mode-association-autocomplete cw-edit-mode-association-autocomplete-filterddl cw-edit-mode-autocomplete-',
          nodeId,
          " cw-edit-mode-association-autocomplete-filter-",
          nodeId
        );
        output.push('"></select></p>');
      }

      output.push(
        '<p class="cw-hidden cw-edit-mode"><label>',
        this.dataLabel,
        '</label>&nbsp;&nbsp;<select multiple data-placeholder="' +
          "Use the arrows or select the objects to associate" +
          '" disabled="disabled" data-ul-container-id="',
        nodeId,
        "-",
        objectId,
        '"  id="cw-edit-mode-autocomplete-',
        nodeId,
        "-",
        objectId,
        '" class="cw-hidden chosen-select cw-edit-mode-association-autocomplete cw-edit-mode-autocomplete-',
        nodeId,
        " cw-edit-mode-association-autocomplete-data-",
        nodeId
      );
      output.push('"></select></p>');
      output.push("</div>");
    }
  };

  function removeItem($e, updateSelect) {
    cwApi.CwPendingEventsManager.setEvent("AssociationRemoveItem");
    var itemId, $select, $opt, $searchResult, $disabled;
    itemId = $e.attr("data-item-id");
    if (updateSelect === true) {
      if (cwApi.globalSearchOnline === true && cwApi.isGlobalSearchEnabled() === true) {
        $searchResult = $e.parents(".property-box-asso").find(".cw-edit-mode-association-search-results");
        $disabled = $searchResult.find('li[data-object-id="' + itemId + '"]');
        $disabled.removeClass("deactive-result").addClass("active-result");
      } else {
        $select = $e.parents(".property-box-asso").find("select");
        $opt = $select.find('option[value="' + itemId + '"]');
        $opt.removeAttr("selected");
        $select.trigger("chosen:updated");
      }
    }
    $e.addClass("animated bounceOutDown");
    setTimeout(function () {
      $e.remove();
      cwApi.CwPendingEventsManager.deleteEvent("AssociationRemoveItem");
    }, 1000);
  }

  function checkFilter(values, property) {
    var showError = false;
    if (values.OperatorString === "=" && property !== values.DisplayValue) {
      showError = true;
    } else if (values.OperatorString === "!=" && property === values.DisplayValue) {
      showError = true;
    } else if (values.OperatorString === ">=" && property < values.DisplayValue) {
      showError = true;
    } else if (values.OperatorString === "<=" && property > values.DisplayValue) {
      showError = true;
    } else if (values.OperatorString === ">" && property <= values.DisplayValue) {
      showError = true;
    } else if (values.OperatorString === "<" && property >= values.DisplayValue) {
      showError = true;
    } else if (values.OperatorString === "IN") {
      if (property === "__|UndefinedValue|__") property = "Undefined"; // Hack for undefined look ups
      if (values.DisplayValue.indexOf(property) === -1) showError = true;
    }
    return showError;
  }

  function isWarning(filters, properties) {
    var showError = false;
    Object.keys(filters).some(function (key) {
      var property = properties[key.toLowerCase()];
      filters[key].some(function (values) {
        showError = checkFilter(values, property);
        return showError;
      });
      return showError;
    });
    return showError;
  }

  cwLayoutFilteredListBox.prototype.drawAssociations = function (output, associationTitleText, object) {
    if (cwApi.customLibs.utils === undefined) {
      output.push("<h2> Please Install Utils library </h2>");
      return;
    }
    var l, listBoxNameFromNode, associationTypeScriptName, associationTargetNode, objectId, canAddAssociation, ot, nodeSchema, layout;

    nodeSchema = this.mmNode;
    if (cwApi.isNull(object)) {
      // Is a creation page therefor a real object does not exist
      if (!cwApi.isUndefined(this.mmNode.AssociationsTargetObjectTypes[this.nodeID])) {
        objectId = Math.floor(Math.random() * 10000000);
        associationTargetNode = this.mmNode.AssociationsTargetObjectTypes[this.nodeID];
        nodeSchema = cwApi.ViewSchemaManager.getNodeSchemaById(this.viewSchema.ViewName, associationTargetNode.nodeID);
      } else {
        return;
      }
    } else {
      if (!cwApi.isUndefined(object.associations[this.nodeID])) {
        objectId = object.object_id;
        associationTargetNode = object.associations[this.nodeID];
      } else {
        return;
      }
    }
    this.htmlID = this.nodeID + "-" + objectId;
    output.push("<div");
    if (this.options.CustomOptions["title"] !== "") {
      listBoxNameFromNode = this.options.CustomOptions["title"];
    } else {
      listBoxNameFromNode = cwApi.mapToTranslation(this.viewSchema.NodesByID[this.nodeID].NodeName);
    }

    associationTypeScriptName = nodeSchema.AssociationTypeScriptName;

    output.push(" data-association-scriptname='", associationTypeScriptName, "'");
    output.push(" data-target-scriptname='", nodeSchema.ObjectTypeScriptName.toLowerCase(), "'");
    output.push(" data-node-id='", nodeSchema.NodeID, "'");
    if (!cwApi.isUndefined(objectId)) {
      output.push(" data-source-id='", objectId, "'");
    }
    output.push(" class='filteredListBox property-box ", this.nodeID, "-node-box property-box-asso ");
    if (associationTargetNode.length > 0 || cwApi.queryObject.isEditMode()) {
      output.push("cw-visible");
    } else {
      output.push("cw-hidden");
    }
    output.push("'>");
    output.push("<ul class='property-details ", this.nodeID, "-details ", this.nodeID, "-", objectId, "-details'>");
    output.push(
      "<li id='htmlbox-header-",
      this.nodeID,
      "-",
      objectId,
      "' class='property-details ",
      this.nodeID,
      "-details property-title ",
      this.nodeID,
      "-title ",
      this.nodeID,
      "-",
      objectId,
      "-details'>"
    );
    output.push('<div class="cw-property-details-left">');

    output.push('<div class="htmlbox-header-icon" class="');

    if (associationTargetNode.length > 0 || cwApi.queryObject.isEditMode()) {
      output.push("cw-visible");
    } else {
      output.push("cw-hidden");
    }
    output.push('">');

    output.push('<div id="htmlbox-', this.nodeID, "-", objectId, '" class="');
    if (this.options.CustomOptions["collapse"] === true) {
      output.push("fa fa-plus");
    } else {
      output.push("fa fa-minus");
    }
    output.push('"></div>');
    output.push('<label class="cw-property-title-displayname">', listBoxNameFromNode, "</label></div>");

    output.push("</div>");

    output.push('<div class="cw-property-details-right">');

    canAddAssociation = cwApi.cwEditProperties.canAddAssociationInput(this.nodeID);

    if (canAddAssociation === true) {
      ot = cwApi.mm.getObjectType(nodeSchema.ObjectTypeScriptName.toLowerCase());
      if (!cwApi.cwEditProperties.isObjectTypeForbiddenToAdd(nodeSchema.ObjectTypeScriptName) && this.creationPage) {
        output.push(
          '<a id="create_listbox_on_objectpage-',
          this.htmlID,
          '" class="cw-hidden btn no-text cw-doc-action cw-create-target-item" title="',
          $.i18n.prop("editProperties_createAssociationTarget", cwAPI.mm.getObjectType(nodeSchema.ObjectTypeScriptName).name),
          '"><i class="fa fa-plus cw-association-add-item cw-add-association"></i></a>'
        );
      }
      if (cwApi.cwEditProperties.canAddAssociationInput(this.nodeId)) {
        output.push(
          '<a class="btn no-text cw-hidden cw-doc-action cw-associate-to-existing-item cw-associate-to-existing-item-filtered" id="cw-edit-mode-add-autocomplete-',
          this.nodeID,
          "-",
          objectId,
          '"><i class="cw-association-associate-to-item fa fa-link" title="',
          $.i18n.prop("EditModeAssociateToOpenIconTooltip", ot.name),
          '"></i></a>'
        );
      }
    }
    output.push("</div>");
    if (canAddAssociation === true) {
      this.appendAssociationSelect(output, this.nodeID, objectId);
    }

    output.push("</li>");
    output.push(
      "<li id='",
      this.nodeID,
      "-",
      objectId,
      "-value' class='property-details property-value ",
      this.nodeID,
      "-details ",
      this.nodeID,
      "-value ",
      this.nodeID,
      "-",
      objectId,
      "-details'>"
    );

    if (false && this.isUsingDirective()) {
      // ready-only working only so disable for the moment
      this.associationTargetNode = associationTargetNode;
      // create a hidden li so the ul don't get delete by the display manager
      output.push("<ul id='cw-layout-", this.layoutId, "'><li style='display:none;'></li></ul>");
    } else {
      l = cwApi.cwEditProperties.getLayoutWithTemplateOptions(this);
      l.drawAssociations(output, listBoxNameFromNode, object);
    }

    output.push("</li>");
    output.push("</ul>");
    output.push("</div>");
    this.objectId = objectId;
  };

  cwLayoutFilteredListBox.prototype.addToWaitingForUpdate = function (objectTypeScriptName, callback) {
    if (cwApi.isUndefined(this.waitingForUpdates[objectTypeScriptName])) {
      this.waitingForUpdates[objectTypeScriptName] = [callback];
    } else {
      this.waitingForUpdates[objectTypeScriptName].push(callback);
    }
  };

  cwLayoutFilteredListBox.prototype.updateWaitingForUpdateList = function (objectTypeScriptName, json) {
    if (!cwApi.isUndefined(this.waitingForUpdates[objectTypeScriptName])) {
      for (var i = 0; i < this.waitingForUpdates[objectTypeScriptName].length; i++) {
        var callback = this.waitingForUpdates[objectTypeScriptName][i];
        callback(json);
      }
      delete this.waitingForUpdates[objectTypeScriptName];
    }
  };

  cwLayoutFilteredListBox.prototype.getItems = function (callback) {
    var self = this;
    var otName = this.targetObjectTypeScriptName;

    if (!cwApi.isUndefined(this.loadingInProgress[otName])) {
      return addToWaitingForUpdate(this, otName, callback);
    }

    var targetView = cwAPI.getView(this.targetViewName);
    if (targetView === undefined) {
      // message d'erreur
      cwAPI.notificationManager.addError(this.targetViewName + " doesn't exist");
      return;
    }
    if (targetView.type === "Index") {
      var url = cwApi.getLiveServerURL() + "page/" + this.targetViewName + "?" + Math.random();
    } else {
      let queryObject = cwApi.getQueryStringObject();
      let id = this.objectId;
      if (queryObject.cwcreatesourceviewid) id = queryObject.cwcreatesourceviewid;
      var url = cwApi.getLiveServerURL() + "page/" + this.targetViewName + "/" + id + "?" + Math.random();
    }

    this.loadingInProgress[otName] = true;
    $.getJSON(url, function (json) {
      // manage hidden Nodes
      var nodeIDs = Object.keys(cwAPI.getViewsSchemas()[self.targetViewName].NodesByID);
      if (self.firstNodeId !== "") nodeIDs.splice(nodeIDs.indexOf(self.firstNodeId), 1);
      if (self.secondNodeId !== "") nodeIDs.splice(nodeIDs.indexOf(self.secondNodeId), 1);

      if (targetView.type === "Index") {
        cwAPI.customLibs.utils.manageHiddenNodes(json, nodeIDs);
      } else {
        json = json.object.associations;
        cwAPI.customLibs.utils.manageHiddenNodes(json, nodeIDs);
      }

      self.loadedItems[otName] = json[self.firstNodeId];

      self.updateWaitingForUpdateList(otName, json);
      delete self.loadingInProgress[otName];
      return callback(json);
    });
  };

  cwLayoutFilteredListBox.prototype.getSecondItems = function (id, callback) {
    var otName = this.targetObjectTypeScriptName + id;
    var self = this;

    if (!cwApi.isUndefined(this.loadingInProgress[otName])) {
      return this.addToWaitingForUpdate(otName, callback);
    }

    var targetView = cwAPI.getView(this.dataViewName);
    if (targetView === undefined) {
      // message d'erreur
      cwAPI.notificationManager.addError(this.dataViewName + " doesn't exist");
      return;
    }

    var url = cwApi.getLiveServerURL() + "page/" + this.dataViewName + "/" + id + "?" + Math.random();

    this.loadingInProgress[otName] = true;
    $.getJSON(url, function (json) {
      // manage hidden Nodes
      var nodeIDs = Object.keys(cwAPI.getViewsSchemas()[self.dataViewName].NodesByID);
      nodeIDs.splice(nodeIDs.indexOf(self.secondNodeId), 1);
      cwAPI.customLibs.utils.manageHiddenNodes(json.object.associations, nodeIDs);
      json = json.object.associations;

      self.secondLoadedItems[otName] = json[self.secondNodeId];

      self.updateWaitingForUpdateList(otName, json);
      delete self.loadingInProgress[otName];
      return callback(json);
    });
  };

  cwLayoutFilteredListBox.prototype.setOptionListToSelect = function ($select, json) {
    var o, list, i, item, markedForDeletion;
    o = ["<option></option>"];
    list = json[Object.keys(json)[0]];
    if (list) {
      for (i = 0; i < list.length; i++) {
        item = list[i];
        this.itemsById[item.object_id] = item;
        markedForDeletion = cwApi.isObjectMarkedForDeletion(item) ? ' class="markedForDeletion"' : "";
        o.push("<option ", markedForDeletion, '" value="', item.object_id, '"');
        if (!cwApi.isUndefined(this.alreadyAssociatedItems[item.object_id])) {
          o.push(" selected");
        }

        o.push(">", cwAPI.customLibs.utils.getItemDisplayString(this.targetViewName, item), "</option>");
      }
    }
    $select.html(o.join(""));
  };

  cwLayoutFilteredListBox.prototype.showDeleteIconsAndSetActions = function (mainContainer) {
    var deleteIcons, i, icon, canDelete, $li;

    if (!cwApi.isUndefined(mainContainer)) {
      deleteIcons = mainContainer.find(".cw-association-delete-item");
    } else {
      deleteIcons = $(".cw-association-delete-item");
    }

    function removeFirstItem() {
      var $e = $(this).parents(".cw-item:first");
      removeItem($e, true);
    }

    for (i = 0; i < deleteIcons.length; i += 1) {
      icon = $(deleteIcons[i]);
      canDelete = $(icon.parents("li")[0]).attr("data-intersection-candelete");

      $li = $(icon.parents("li")[0]);
      //Listbox - list box || Listbox - List
      if ($li.parents(".property-box").length > 1 || $li.parents("li.cw-item").length > 0) {
        canDelete = false;
      }

      if (canDelete === "true" || canDelete === "undefined") {
        icon.show();
        icon.off("click.delete");
        icon.on("click.delete", removeFirstItem);
      }
    }
  };

  cwLayoutFilteredListBox.prototype.addOnChangeItem = function (schema, itemId, showError) {
    var drawOneLayout;
    var itemOutput = [];

    if (schema.RootNodesId === undefined) schema.RootNodesId = [schema.nodeID];
    if (schema.NodesByID === undefined) {
      schema.NodesByID = {};
      schema.NodesByID[schema.nodeID] = schema;
    }
    if (schema.LayoutDrawOneOptions !== null) {
      drawOneLayout = new cwApi.cwLayouts[schema.LayoutDrawOne](schema.LayoutDrawOneOptions, schema);
    } else {
      drawOneLayout = new cwApi.cwLayouts.cwLayoutList(schema.LayoutOptions, schema);
    }

    var l = cwApi.cwEditProperties.getLayoutWithTemplateOptions(drawOneLayout);
    l.disableOutputChildren();

    l.drawOneMethod = drawOneLayout.drawOneMethod.bind(l);
    l.drawOneMethod(itemOutput, this.itemsById[itemId], undefined, false);
    this.alreadyAssociatedItems[itemId] = true;
    this.$ulContainer.append(itemOutput.join(""));
    this.$ulContainer.find("li").last().addClass("newly-added");
    if (showError) {
      var o = [];
      o.push(
        '<i class="cw-association-filtered-item fa fa-exclamation" title="',
        $.i18n.prop("editProperties_gs_associate_filter_warning"),
        '"></i>'
      );
      this.$ulContainer.find("li").last().find("div").first().append(o.join(""));
    }
    var mainContainer = $("li." + schema.NodeID + "-value");
    this.showDeleteIconsAndSetActions(mainContainer);
  };

  cwLayoutFilteredListBox.prototype.onFilterChange = function (evt, params) {
    var self = this;
    // reset select data
    var $selectData = $("select.cw-edit-mode-association-autocomplete-data-" + this.nodeID);
    if (params.selected) {
      var itemId = params.selected;
      var json;
      if (this.dataViewName !== "") {
        this.getSecondItems(itemId, function (json) {
          self.setOptionListToSelect($selectData, json);
          $selectData.trigger("chosen:updated");
          $selectData.off("change");
          $selectData.on("change", self.onSelectChange.bind(self));
        });
      } else {
        json = this.itemsById[itemId].associations;
        this.setOptionListToSelect($selectData, json);
        $selectData.trigger("chosen:updated");
        $selectData.off("change");
        $selectData.on("change", self.onSelectChange.bind(self));
      }
    }
  };

  cwLayoutFilteredListBox.prototype.onSelectChange = function (evt, params) {
    if (params.selected) {
      var extraPropertyNames = [];
      var itemId = params.selected;
      var schema = cwApi.ViewSchemaManager.getNodeSchemaByIdForCurrentView(this.nodeID);
      var self = this;
      if (!cwApi.isObjectEmpty(schema.Filters)) {
        Object.keys(schema.Filters).forEach(function (key) {
          extraPropertyNames.push(key);
        });
        cwApi.CwRest.Diagram.getExistingObject(schema.ObjectTypeScriptName, itemId, extraPropertyNames, function (isSuccess, completeObj) {
          if (isSuccess) {
            var showError = isWarning(schema.Filters, completeObj.properties);
            if (showError) {
              cwApi.notificationManager.addNotification($.i18n.prop("EditModeAssociateItemFiltered"), "error");
            }
            self.addOnChangeItem(schema, itemId, showError);
          }
        });
      } else {
        self.addOnChangeItem(schema, itemId, false);
      }
    }
  };

  cwLayoutFilteredListBox.prototype.execFilterEdit = function () {
    var $a = $("a#cw-edit-mode-add-autocomplete-" + this.nodeID + "-" + this.objectId);
    var $assoBox = $("div.property-box." + this.nodeID + "-node-box.property-box-asso");
    var self = this;
    $a.off("click").on("click", function () {
      cwApi.CwPendingEventsManager.setEvent("SetActionsOnAddToExistingLink");
      var $select = $assoBox.find("select.cw-edit-mode-association-autocomplete");
      var $selectFilter = $assoBox.find("select.cw-edit-mode-association-autocomplete-filter-" + self.nodeID);
      var $selectData = $assoBox.find("select.cw-edit-mode-association-autocomplete-data-" + self.nodeID);
      $select.toggleClass("cw-hidden");

      // show/hide the labels
      var $labels = $assoBox.find("p.cw-edit-mode");
      $labels.toggleClass("cw-hidden");

      $select.next("div.chosen-container").toggleClass("cw-hidden");

      if (!$select.hasClass("cw-hidden")) {
        self.$ulContainer = $("ul.cw-list." + self.nodeID);

        self.$ulContainer.children(".cw-item").each(function (i, li) {
          self.alreadyAssociatedItems[$(li).attr("data-item-id")] = true;
        });

        // is no more hidden
        self.getItems(function (json) {
          $select.removeAttr("disabled");
          $select.chosen({
            no_results_text: $.i18n.prop("EditModeAssociateNoItemFound"),
            display_selected_options: false,
          });

          if (self.firstNodeId !== "") {
            self.setOptionListToSelect($selectFilter, json, {});
            $selectFilter.trigger("chosen:updated");
            $selectFilter.off("change");
            $selectFilter.on("change", self.onFilterChange.bind(self));
          } else {
            self.setOptionListToSelect($selectData, json, {});
            $selectData.trigger("chosen:updated");
            $selectData.off("change");
            $selectData.on("change", self.onSelectChange.bind(self));
          }
        });
      }
      cwApi.CwPendingEventsManager.deleteEvent("SetActionsOnAddToExistingLink");
    });
  };

  cwLayoutFilteredListBox.prototype.applyJavaScript = function () {
    var self = this;

    this.execFilterEdit();
    if (this.creationPage) {
      var createButton = document.getElementById("create_listbox_on_objectpage-" + this.htmlID);
      if (createButton) createButton.addEventListener("click", this.navigatetoObjectPage.bind(this));
    }
    var expendButton = document.getElementById("htmlbox-header-" + this.htmlID);
    if (expendButton) expendButton.addEventListener("click", this.manageExpend.bind(this));
  };

  cwLayoutFilteredListBox.prototype.navigatetoObjectPage = function (e) {
    var url,
      queryObject = cwApi.getQueryStringObject(),
      view = queryObject.cwview,
      tabid = queryObject.cwtabid,
      asso = {},
      item = {},
      sourceObjectTypeScriptName = this.item.objectTypeScriptName;
    url = cwApi.getCreateHash(this.create_objectpage_name) + "&cwcreatesourceview=" + view;

    if (queryObject.cwtype === cwApi.CwPageType.Single) {
      url = url + "&cwcreatesourceviewid=" + queryObject.cwid;
      item.name = this.item.name;
      item.id = this.item.object_id;
      asso.associationScriptName = cwApi.mm.getReverseAssociation(this.viewSchema.NodesByID[this.nodeID].AssociationTypeScriptName).scriptName;
      asso.displayName = cwApi.mm.getReverseAssociation(this.viewSchema.NodesByID[this.nodeID].AssociationTypeScriptName).displayName;
      asso.nodeId = this.NodeID;
      sourceObjectTypeScriptName = this.item.objectTypeScriptName;

      item.asso = asso;
      localStorage.setItem("AssociationData-" + queryObject.cwid, JSON.stringify(item));
    }
    if (!cwApi.isUndefined(tabid)) {
      url = url + "&cwcreatesourcetabid=" + tabid;
    }

    cwApi.updateURLHash(url);
  };

  cwLayoutFilteredListBox.prototype.manageExpend = function () {
    var listBoxHtml = document.getElementById("htmlbox-" + this.htmlID);
    var htmlID = this.htmlID;

    var a = document.querySelector("#cw-edit-mode-add-autocomplete-role_20527_108451663-" + this.htmlID);

    if (
      (cwApi.queryObject.isEditMode() ||
        cwApi.queryObject.isCreatePage() ||
        document.querySelector("#cw-edit-mode-add-autocomplete-" + this.htmlID).className.indexOf("cw-hidden") === -1) &&
      listBoxHtml.className.indexOf("minus") !== -1
    ) {
      return;
    }
    $("#" + htmlID + "-value").toggle("300", function () {
      $("#htmlbox-" + htmlID)
        .toggleClass("fa fa-minus")
        .toggleClass("fa fa-plus");
    });
  };

  cwApi.cwLayouts.cwLayoutFilteredListBox = cwLayoutFilteredListBox;
})(cwAPI, jQuery);
