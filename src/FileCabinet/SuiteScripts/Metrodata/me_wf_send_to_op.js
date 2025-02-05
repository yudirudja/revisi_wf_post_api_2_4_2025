/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
 */
define(['N/record', './lib/moment.min', './lib/me_online_pajak_utility', './config/config_op', "N/search"], function (record, moment, utilOP, config, search) {

    function getInvoiceData(idInvoice) {

        //get tranid
        var invRecord = record.load({
            type: record.Type.INVOICE,
            id: idInvoice,
            isDynamic: true,
        });
        var fullDiscount = invRecord.getValue('custbody_me_cfield_full_discount');
        //get all item
        var item = [];
        // var taxTotal = 0;
        var lineItemCount = invRecord.getLineCount({
            sublistId: 'item'
        });
        for (i = 0; i < lineItemCount; i++) {

            var idItem = invRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            })

            var lookupItem = search.lookupFields({ // add LookupItem for Latest OnlinePajak API on 2/4/2025
                type: search.Type.ITEM,
                id: idItem,
                columns: ['custitem5', 'custitem4', 'custitem6']
            });

            var itemGroup = invRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_me_cfield_item_group',
                line: i
            })
            var itemName = invRecord.getSublistText({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            })
            var description = invRecord.getSublistText({
                sublistId: 'item',
                fieldId: 'description',
                line: i
            })
            var itemQuantity = invRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: i
            });
            var itemUnitPrice = invRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                line: i
            });
            var dppItem = invRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'amount',
                line: i
            })

            var taxRate = invRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'taxrate1',
                line: i
            })
            var ppnItem = invRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'tax1amt',
                line: i
            })
            var dpp_checkbox = invRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol12',
                line: i
            })

            if (description.toUpperCase().indexOf('DISCOUNT') < 0 && itemName.toUpperCase().indexOf('INCOME TAX') < 0) {
                if (!fullDiscount) {
                    item.push({
                        // "name": itemGroup,
                        "name": description,
                        "quantity": itemQuantity,
                        "unitPrice": itemUnitPrice,
                        "unit": lookupItem.custitem5,//add lookupItem.custitem5 for Latest OnlinePajak API on 2/4/2025
                        "type": lookupItem.custitem4,//add lookupItem.custitem4 for Latest OnlinePajak API on 2/4/2025
                        "code": lookupItem.custitem6,//add lookupItem.custitem6 for Latest OnlinePajak API on 2/4/2025
                        "taxSummary": {
                            'ppn': {
                                'dpp': dppItem,
                                'ppn': ppnItem,
                                'totalPrice': dppItem,
                                'dppLainFlag': dpp_checkbox == true || dpp_checkbox == 'true' || dpp_checkbox == 'T'? true:false,// add DppLainFlag for Latest OnlinePajak API on 2/4/2025
                                'dppLain': Number((Number(itemQuantity) * Number(itemUnitPrice)) * (11/12)).toFixed(2), //add DppLain for Latest OnlinePajak API on 2/4/2025
                            }
                        }
                    })
                } else {
                    item.push({
                        // "name": itemGroup,
                        "name": description,
                        "quantity": itemQuantity,
                        "unitPrice": Math.abs(itemUnitPrice),
                        "discount": Math.abs(dppItem),
                        "unit": lookupItem.custitem5,//add lookupItem.custitem5 for Latest OnlinePajak API on 2/4/2025
                        "type": lookupItem.custitem4,//add lookupItem.custitem4 for Latest OnlinePajak API on 2/4/2025
                        "code": lookupItem.custitem6,//add lookupItem.custitem6 for Latest OnlinePajak API on 2/4/2025
                        "taxSummary": {
                            'ppn': {
                                'dpp': 0,
                                'ppn': 0,
                                'totalPrice': dppItem,
                                'dppLainFlag': dpp_checkbox == true || dpp_checkbox == 'true' || dpp_checkbox == 'T'? true:false,// add DppLainFlag for Latest OnlinePajak API on 2/4/2025
                                'dppLain':  Number((Number(itemQuantity) * Number(itemUnitPrice)) * (11/12)).toFixed(2),//add DppLain for Latest OnlinePajak API on 2/4/2025
                            }
                        }
                    })
                }

            }

            // taxTotal = parseFloat(taxTotal) + parseFloat(ppnItem);
        }


        //get all json data
        var commercialInvoiceNumber = invRecord.getText('tranid');
        var invoiceDate = moment(invRecord.getValue('trandate')).format('YYYY-MM-DD');
        var dueDate = invRecord.getValue('duedate') ? moment(invRecord.getValue('duedate')).format('YYYY-MM-DD') : null;
        var clientReferenceId = idInvoice;
        var downPaymentFlag = 'NORMAL';
        var customerId = invRecord.getValue('entity');
        var dataCustomer = utilOP.lookupCustomer(customerId);
        var documentDate = moment(invRecord.getValue('trandate')).format('YYYY-MM-DD');
        var taxPeriod = moment().format('MM/YYYY');
        var invoiceType = dataCustomer.country == 'ID' ? 'A2' : 'A1';
        var documentType = invoiceType == 'A2' ? '1' : '7';
        var additionalDocumentType = null;
        var periode = invRecord.getValue('custbody_me_cfield_periode');
        var bankname = invRecord.getText('custbody_me_bank');
        var bankaccname = invRecord.getText('custbody_me_bank_account_name');
        var bankaccnum = invRecord.getText('custbody_me_acc_no');
        var emeterai = invRecord.getValue('custbody_tab_field_e_meterai');

        var transactionDetail = invRecord.getValue('custbody_me_cfield_trans_detail_op');
        var additionalTransactionDetail = null;
        var supportingDocumentNumber = null;
        if (transactionDetail == 7) {
            additionalTransactionDetail = invRecord.getValue('custbody_me_cfield_add_trans_dtl_7');
            supportingDocumentNumber = invRecord.getValue('custbody_me_cfield_supp_doc_num');

        } else if (transactionDetail == 8) {
            additionalTransactionDetail = invRecord.getValue('custbody_me_cfield_add_trans_dtl_8')
        }
        var downPaymentFlag = 'NORMAL';
        var downPaymentFlagPpn = 'NORMAL';
        var dpp = invRecord.getValue('custbody_me_cfield_total_amount');
        var ppn = invRecord.getValue('taxtotal');


        //json 
        var jsonValue = {
            "commercialInvoiceNumber": commercialInvoiceNumber,
            "invoiceDate": invoiceDate,
            "dueDate": dueDate,
            "vendor": dataCustomer,
            "items": item,
            "clientReferenceId": clientReferenceId,
            "downPaymentFlag": downPaymentFlag,
            "taxSummary": { //ini ga ada di dn
                "ppn": {
                    "documentDate": documentDate,
                    "taxPeriod": taxPeriod,
                    "invoiceType": invoiceType,
                    "documentType": documentType,
                    "additionalDocumentType": additionalDocumentType,
                    "transactionDetail": transactionDetail,
                    "additionalTransactionDetail": additionalTransactionDetail,
                    "supportingDocumentNumber": supportingDocumentNumber,
                    "reference": commercialInvoiceNumber,
                    "downPaymentFlag": downPaymentFlagPpn,
                    "dpp": dpp,
                    "ppn": ppn,
                }
            },
            "customFieldContent": {
                "period": periode,
                "bankName": bankname,
                "bankAccountName": bankaccname,
                "bankAccountNumber": bankaccnum
            }
        }

        var recCoord = record.load({
            type: 'customrecord_me_master_coordinate',
            id: 1,
            isDynamic: true,
        });

        var lowerLeftX = recCoord.getValue('custrecord_me_lowerleftx');
        var lowerLeftY = recCoord.getValue('custrecord_me_lowerlefty');
        var upperRightX = recCoord.getValue('custrecord_me_upperrightx');
        var upperRightY = recCoord.getValue('custrecordme_upperrighty');

        if (emeterai) {
            jsonValue["emeterai"] = {
                "location": "lokasi stamp",
                "coordinate": {
                    "lowerLeftX": lowerLeftX,
                    "lowerLeftY": lowerLeftY,
                    "upperRightX": upperRightX,
                    "upperRightY": upperRightY,
                    "page": 0
                }
            }
        }

        var finalJson = JSON.stringify(jsonValue);
        return finalJson;
    }

    function onAction(scriptContext) {
        var rec = scriptContext.newRecord;
        var id = rec.id;
        var JSONInvoice = getInvoiceData(id);
        log.debug('json invoice', JSONInvoice)
        var response = utilOP.sendDraft_v03(JSONInvoice, id);
        log.debug('response detail', response)
    }

    return {
        onAction: onAction
    }
});