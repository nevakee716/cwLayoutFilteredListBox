/* Copyright � 2012-2017 erwin, Inc. - All rights reserved */
/*global cwAPI, jQuery*/

(function (cwApi, $) {
    'use strict';
    var cwLayoutFilteredListBox;

    cwLayoutFilteredListBox = function (options, viewSchema) {
        cwApi.extend(this, cwApi.cwLayouts.CwLayout, options, viewSchema);
        this.drawOneMethod = cwApi.cwLayouts.cwLayoutList.drawOne.bind(this);
        cwApi.registerLayoutForJSActions(this);
    };

    cwLayoutFilteredListBox.appendAssociationSelect = function (output, nodeId, objectId, filterLabel, dataLabel) {
        if (cwApi.cwEditProperties.canAddAssociationInput(nodeId)) {
            output.push('<div class="cw-property-details-association">');
            output.push('<p class="cw-hidden cw-edit-mode"><label id="cw-edit-mode-', nodeId, '-', objectId, '-filterlabel">', filterLabel, '</label>&nbsp;&nbsp;',
                '<select id="cw-edit-mode-autocomplete-', nodeId, '-', objectId, '-filterddl" disabled="disabled" class="cw-hidden chosen-select cw-edit-mode-association-autocomplete cw-edit-mode-association-autocomplete-filterddl cw-edit-mode-autocomplete-', 
                nodeId, ' cw-edit-mode-association-autocomplete-filter-', nodeId);
            output.push('"></select></p><p class="cw-hidden cw-edit-mode">');
            output.push('<label>',dataLabel,'</label>&nbsp;&nbsp;<select multiple data-placeholder="' + 'Use the arrows or select the objects to associate' + 
            '" disabled="disabled" data-ul-container-id="', nodeId, '-', objectId, '"  id="cw-edit-mode-autocomplete-', nodeId, '-', objectId, 
                '" class="cw-hidden chosen-select cw-edit-mode-association-autocomplete cw-edit-mode-autocomplete-', nodeId, ' cw-edit-mode-association-autocomplete-data-', nodeId);
            output.push('"></select></p>');
            output.push('</div>');
        }
    }; 

    function removeItem($e, updateSelect) {
        cwApi.CwPendingEventsManager.setEvent("AssociationRemoveItem");
        var itemId, $select, $opt, $searchResult, $disabled;
        itemId = $e.attr('data-item-id');
        if (updateSelect === true) {
            if (cwApi.globalSearchOnline === true && cwApi.isGlobalSearchEnabled() === true) {
                $searchResult = $e.parents('.property-box-asso').find('.cw-edit-mode-association-search-results');
                $disabled = $searchResult.find('li[data-object-id="' + itemId + '"]');
                $disabled.removeClass("deactive-result").addClass("active-result");
            } else {
                $select = $e.parents('.property-box-asso').find('select');
                $opt = $select.find('option[value="' + itemId + '"]');
                $opt.removeAttr('selected');
                $select.trigger('chosen:updated');
            }
        }
        $e.addClass('animated bounceOutDown');
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
        var l, listBoxNameFromNode, associationTypeScriptName, associationTargetNode, objectId, canAddAssociation, ot, nodeSchema, layout;

        layout = this;
        nodeSchema = this.mmNode;

        if (cwApi.isNull(object)) {
            // Is a creation page therefor a real object does not exist
            if (!cwApi.isUndefined(layout.mmNode.AssociationsTargetObjectTypes[layout.nodeID])) {
                objectId = 0;
                associationTargetNode = layout.mmNode.AssociationsTargetObjectTypes[layout.nodeID];
                nodeSchema = cwApi.ViewSchemaManager.getNodeSchemaById(this.viewSchema.ViewName, associationTargetNode.nodeID);
            } else {
                return;
            }
        } else {
            if (!cwApi.isUndefined(object.associations[layout.nodeID])) {
                objectId = object.object_id;
                associationTargetNode = object.associations[layout.nodeID];
            } else {
                return;
            }
        }

        output.push("<div");
        listBoxNameFromNode = cwApi.mapToTranslation(nodeSchema.NodeName);
        associationTypeScriptName = nodeSchema.AssociationTypeScriptName;

        output.push(" data-association-scriptname='", associationTypeScriptName, "'");
        output.push(" data-target-scriptname='", nodeSchema.ObjectTypeScriptName.toLowerCase(), "'");
        output.push(" data-node-id='", nodeSchema.NodeID, "'");
        if (!cwApi.isUndefined(objectId)) {
            output.push(" data-source-id='", objectId, "'");
        }
        output.push(" class='property-box ", layout.nodeID, "-node-box property-box-asso ");
        if (associationTargetNode.length > 0 || cwApi.queryObject.isEditMode()) {
            output.push('cw-visible');
        } else {
            output.push('cw-hidden');
        }
        output.push("'>");
        output.push("<ul class='property-details ", layout.nodeID, "-details ", layout.nodeID, "-", objectId, "-details'>");
        output.push("<li class='property-details ", layout.nodeID, "-details property-title ", layout.nodeID, "-title ", layout.nodeID, "-", objectId, "-details'>");
        output.push('<div class="cw-property-details-left">');
        output.push('<label class="cw-property-title-displayname">', listBoxNameFromNode, '</label>');
        output.push('</div>');

        output.push('<div class="cw-property-details-right">');
        canAddAssociation = cwApi.cwEditProperties.canAddAssociationInput(layout.nodeID);

        if (canAddAssociation === true) {
            ot = cwApi.mm.getObjectType(nodeSchema.ObjectTypeScriptName.toLowerCase());
            if (cwApi.cwEditProperties.canAddAssociationInput(layout.nodeId)) {
                output.push('<a class="btn no-text cw-hidden cw-doc-action cw-associate-to-existing-item cw-associate-to-existing-item-filtered" id="cw-edit-mode-add-autocomplete-', layout.nodeID, '-', objectId, '"><i class="cw-association-associate-to-item fa fa-link" title="', $.i18n.prop('EditModeAssociateToOpenIconTooltip', ot.name), '"></i></a>');
            }
        }
        output.push('</div>');
        if (canAddAssociation === true) {
            cwLayoutFilteredListBox.appendAssociationSelect(output, layout.nodeID, objectId, this.options.CustomOptions['filtered-ddl-label'], this.options.CustomOptions['selection-ddl-label']);
        }

        output.push("</li>");
        output.push("<li id='", layout.nodeID, "-", objectId, "-value' class='property-details property-value ", layout.nodeID, "-details ", layout.nodeID, "-value ", layout.nodeID, "-", objectId, "-details'>");

        if (false && this.isUsingDirective()) { // ready-only working only so disable for the moment
            this.associationTargetNode = associationTargetNode;
            // create a hidden li so the ul don't get delete by the display manager
            output.push("<ul id='cw-layout-", this.layoutId, "'><li style='display:none;'></li></ul>");
        } else {
            l = cwApi.cwEditProperties.getLayoutWithTemplateOptions(this);
            l.drawAssociations(output, listBoxNameFromNode, object);
        }

        output.push("</li>");
        output.push("</ul>");
        output.push('</div>');
        this.layoutId = layout.nodeID;
        this.objectId = objectId;
    };

    function addToWaitingForUpdate(that, objectTypeScriptName, callback) {
        if (cwApi.isUndefined(that.waitingForUpdates[objectTypeScriptName])) {
            that.waitingForUpdates[objectTypeScriptName] = [callback];
        } else {
            that.waitingForUpdates[objectTypeScriptName].push(callback);
        }
    }

    function updateWaitingForUpdateList(that, objectTypeScriptName, json) {
        if (!cwApi.isUndefined(that.waitingForUpdates[objectTypeScriptName])) {
            for (var i = 0; i < that.waitingForUpdates[objectTypeScriptName].length; i++) {
                var callback = that.waitingForUpdates[objectTypeScriptName][i];
                callback(json);
            }
            delete that.waitingForUpdates[objectTypeScriptName];
        }
    }

    function getItems(that, assoToLoad, callback) {
        var otName = assoToLoad.targetObjectTypeScriptName;
        if (!cwApi.isUndefined(that.loadedItems[otName])) {
            return callback(that.loadedItems[otName]);
        }
        if (!cwApi.isUndefined(that.loadingInProgress[otName])) {
            return addToWaitingForUpdate(that, otName, callback);
        }
        var url = cwApi.getLiveServerURL() + "page/" + assoToLoad.targetViewName + '?' + Math.random();
        that.loadingInProgress[otName] = true;
        $.getJSON(url, function (json) {
            that.loadedItems[otName] = json[assoToLoad.nodeId];
            updateWaitingForUpdateList(that, otName, json);
            delete that.loadingInProgress[otName];
            return callback(json);
        });
    }

    function setOptionListToSelect($select, json, itemsById, alreadyAssociatedItems) {
        var o, list, i, item, markedForDeletion;
        o = ['<option></option>'];
        list = json[Object.keys(json)[0]];
        for (i = 0; i < list.length; i++) {
            item = list[i];
            itemsById[item.object_id] = item;
            markedForDeletion = cwApi.isObjectMarkedForDeletion(item) ? ' class="markedForDeletion"' : '';
            o.push('<option ', markedForDeletion, '" value="', item.object_id, '"');
            if (!cwApi.isUndefined(alreadyAssociatedItems[item.object_id])) {
                o.push(' selected');
            }
            o.push('>', item.name, '</option>');
        }
        $select.html(o.join(''));
    }

    function showDeleteIconsAndSetActions (mainContainer) {
        var deleteIcons, i, icon, canDelete, $li;

        if (!cwApi.isUndefined(mainContainer)) {
            deleteIcons = mainContainer.find('.cw-association-delete-item');
        } else {
            deleteIcons = $('.cw-association-delete-item');
        }

        function removeFirstItem() {
            var $e = $(this).parents(".cw-item:first");
            removeItem($e, true);
        }

        for (i = 0; i < deleteIcons.length; i += 1) {
            icon = $(deleteIcons[i]);
            canDelete = $(icon.parents('li')[0]).attr('data-intersection-candelete');

            $li = $(icon.parents('li')[0]);
            //Listbox - list box || Listbox - List
            if ($li.parents('.property-box').length > 1 || $li.parents('li.cw-item').length > 0) {
                canDelete = false;
            }

            if (canDelete === "true" || canDelete === "undefined") {
                icon.show();
                icon.off('click.delete');
                icon.on('click.delete', removeFirstItem);
            }
        }
    }

    function addOnChangeItem(schema, obj, itemId, showError) {
        var drawOneLayout;
        var itemOutput = [];
        if (schema.LayoutDrawOneOptions !== null) {
            drawOneLayout = new cwApi.cwLayouts[schema.LayoutDrawOne](schema.LayoutDrawOneOptions);
        } else {
            drawOneLayout = new cwApi.cwLayouts.cwLayoutList(schema.LayoutOptions);
        }

        var l = cwApi.cwEditProperties.getLayoutWithTemplateOptions(drawOneLayout);
        l.disableOutputChildren();

        l.drawOneMethod = drawOneLayout.drawOneMethod.bind(l);
        l.drawOneMethod(itemOutput, obj.itemsById[itemId], undefined, false);
        obj.$ulContainer.append(itemOutput.join(''));
        obj.$ulContainer.find("li").last().addClass("newly-added");
        if (showError) {
            var o = [];
            o.push('<i class="cw-association-filtered-item fa fa-exclamation" title="', $.i18n.prop('editProperties_gs_associate_filter_warning'), '"></i>');
            obj.$ulContainer.find("li").last().find('div').first().append(o.join(''));
        }
        var mainContainer = $('li.' + schema.NodeID + '-value');
        showDeleteIconsAndSetActions(mainContainer);
    }

    function onFilterChange(evt, params){
        // reset select data
        var $selectData = $('select.cw-edit-mode-association-autocomplete-data-' + this.assoToLoad.layoutId);
        if (params.selected){
            var itemId = params.selected;
            var itemsById = {};
            var json = this.itemsById[itemId].associations;
            setOptionListToSelect($selectData, json, itemsById, this.alreadyAssociatedItems);
            $selectData.trigger("chosen:updated");
            $selectData.off('change');
            $selectData.on('change', onSelectChange.bind({
                $ulContainer: this.$ulContainer,
                assoToLoad: this.assoToLoad,
                itemsById: itemsById,
                editAassociationManager: this
            }));
        }
    }

    function onSelectChange(evt, params) {
        if (params.selected) {
            var extraPropertyNames = [];
            var itemId = params.selected;
            var schema = cwApi.ViewSchemaManager.getNodeSchemaByIdForCurrentView(this.assoToLoad.layoutId);
            var that = this;
            if (!cwApi.isObjectEmpty(schema.Filters)) {
                Object.keys(schema.Filters).forEach(function (key) {
                    extraPropertyNames.push(key);
                });
                cwApi.CwRest.Diagram.getExistingObject(
                    schema.ObjectTypeScriptName,
                    itemId,
                    extraPropertyNames,
                    function (isSuccess, completeObj) {
                        if (isSuccess) {
                            var showError = isWarning(schema.Filters, completeObj.properties);
                            if (showError) {
                                cwApi.notificationManager.addNotification($.i18n.prop('EditModeAssociateItemFiltered'), 'error');
                            }
                            addOnChangeItem(schema, that, itemId, showError);
                        }
                    });
            } else {
                addOnChangeItem(schema, this, itemId, false);
            }
        }
    }

    function execFilterEdit(layout){
        var $a = $('a#cw-edit-mode-add-autocomplete-' + layout.layoutId + '-' + layout.objectId);
        var $assoBox = $('div.property-box.' + layout.layoutId + '-node-box.property-box-asso');
        var assoToLoad = {
            layoutId: layout.layoutId,
            nodeId: layout.options.CustomOptions['view-root-nodeid'],
            sourceId : layout.objectId,
            targetObjectTypeScriptName : layout.mmNode.ObjectTypeScriptName,
            targetViewName: layout.options.CustomOptions['filtered-view']
        };
        layout.loadedItems = {};
        layout.loadingInProgress = {};
        layout.waitingForUpdates = {};
        $a.off('click').on('click', function(){
            cwApi.CwPendingEventsManager.setEvent("SetActionsOnAddToExistingLink");
            var $select = $assoBox.find('select.cw-edit-mode-association-autocomplete');
            var $selectFilter = $assoBox.find('select.cw-edit-mode-association-autocomplete-filter-'+layout.layoutId);
            var $selectData = $assoBox.find('select.cw-edit-mode-association-autocomplete-data-' + layout.layoutId);
            $select.toggleClass('cw-hidden');

            // show/hide the labels
            var $labels = $assoBox.find('p.cw-edit-mode');
            $labels.toggleClass('cw-hidden');

            $select.next('div.chosen-container').toggleClass('cw-hidden');

            if (!$select.hasClass('cw-hidden')) {

                var $ulContainer = $("ul.cw-list." + assoToLoad.layoutId);
                var alreadyAssociatedItems = {};

                $ulContainer.children('.cw-item').each(function (i, li) {
                    alreadyAssociatedItems[$(li).attr('data-item-id')] = true;
                });

                // is no more hidden
                getItems(layout, assoToLoad, function (json) {
                    var itemsById = {};
                    //setOptionListToSelect($selectFilter, json, itemsById, alreadyAssociatedItems);
                    setOptionListToSelect($selectFilter, json, itemsById, {});
                    $select.removeAttr('disabled');
                    $select.chosen({
                        no_results_text: $.i18n.prop('EditModeAssociateNoItemFound'),
                        display_selected_options: false
                    });

                    $selectFilter.off('change');
                    $selectFilter.on('change', onFilterChange.bind({
                        $ulContainer: $ulContainer,
                        assoToLoad: assoToLoad,
                        itemsById: itemsById,
                        editAassociationManager: this,
                        alreadyAssociatedItems: alreadyAssociatedItems
                    }));
                });
            }
            cwApi.CwPendingEventsManager.deleteEvent("SetActionsOnAddToExistingLink");
        });
    }

    cwLayoutFilteredListBox.prototype.applyJavaScript = function () {
        var that = this;
        var intervalId = setInterval(function () {
            var edit = cwApi.getQueryStringObject().cwmode;
            if (edit === 'edit') {
                var $a = $('a#cw-edit-mode-add-autocomplete-' + that.layoutId + '-' + that.objectId);
                $a.removeClass('cw-hidden');
                clearInterval(that.intervalId);
            }
        }, 500);
        execFilterEdit(that);
    };

    cwApi.cwLayouts.cwLayoutFilteredListBox = cwLayoutFilteredListBox;

}(cwAPI, jQuery));