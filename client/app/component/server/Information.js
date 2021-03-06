﻿Ext.define('Nerif.component.server.Information', {
	extend: 'Ext.form.FieldContainer',

	bodyPadding: '10px',

	layout: {
		type: 'hbox',
		align: 'stretch'
	},

	initComponent: function () {
		var obj = this;

		var updateHelpPanel = function() {
			helpPanel.update(Gerenciador.getServerDescription());
		};

		var serverStore = Ext.create('Ext.data.Store', {
			fields: ['id', 'name'],
			proxy: {
				type: 'ajax',
				url: 'config/servers.json',
				reader: {
					type: 'json',
					rootProperty: 'servers'
				}
			},
			sorters: [{
				property: 'name',
				direction: 'ASC'
			}]
		});
		
		var ajustarCampos = function(value, clear) {
			logDirectoryText.enable();
			logDirectoryText.setValue(null);
			logDirectoryText.validate();

			logFormatTag.enable();
			logFormatTag.suspendEvent('beforedeselect');
			logFormatTag.setValue(null);
			logFormatTag.resumeEvent('beforedeselect');
			logFormatTag.validate();

			logFormatTag.valueField = value;

			logFormatStore.clearFilter();
			logFormatStore.filterBy(function (rec) {						
				return !!rec.get(logFormatTag.valueField);
			});

			if(clear) {
				Gerenciador.clear();
			}
			
			Gerenciador.server = value;			
			
			updateHelpPanel();
			
			if(clear) {
				obj.fireEvent('serverchanged');
			}
		};
		
		var serverComboBox = Ext.create('Ext.form.ComboBox', {
			allowBlank: false,
			store: serverStore,
			editable: false,
			valueField: 'id',
			displayField: 'name',
			fieldLabel: 'Servidor',
			listeners: {
				'change': function (me, value, old) {
					if(old) {
						Ext.Msg.confirm('Atenção', 'Todas as configurações serão perdidas. Deseja continuar?', function(btn) {
							if(btn === 'yes') {
								ajustarCampos(value, true);
							} else {
								me.suspendEvent('change');
								me.setValue(old);
								me.resumeEvent('change');
							}
						});
					} else {					
						ajustarCampos(value, false);
					}
				}
			}
		});

		const dialog = require('electron').remote.dialog;

		var logDirectoryText = Ext.create('Ext.form.Text', {
			allowBlank: false,
			fieldLabel: 'Diretório (logs)',
			disabled: true,
			editable: false,
			listeners: {
				'change': function(me, value) {
					Gerenciador.logDirectory = value;
				}
			},
			triggers: {
				chooser: {
					cls: 'fa-folder-open',
					hideOnReadOnly: false,
					handler: function() {
						var dir = dialog.showOpenDialog({properties: ['openDirectory']});
						if(dir)
							logDirectoryText.setValue(dir);
					}
				}
			}
		});

		Ext.define('Property', {
			extend: 'Ext.data.Model',
			idProperty: 'infoPropriedade',
			fields: [
			         { name: 'description' },
			         { name: 'infoPropriedade' },
			         { name: 'tipoValor' },
			         { name: 'apache' },
			         { name: 'nginx' },
			         { name: 'iis' }
			         ]
		});

		var logFormatStore = Ext.create('Ext.data.Store', {
			model: 'Property',
			proxy: {
				type: 'ajax',
				url: 'config/properties.json',
				reader: {
					type: 'json',
					rootProperty: 'properties'
				}
			},
			sorters: [{
				property: 'description',
				direction: 'ASC'
			}]
		});

		var logFormatTag = Ext.create('Ext.form.field.Tag', {
			store: logFormatStore,
			allowBlank: false,
			filterPickList: true,
			fieldLabel: 'Formato (logs)',
			displayField: 'description',
			queryMode: 'local',
			disabled: true,
			listeners: {
				'beforedeselect': function (me, record) {
					for(var i = 0; i < Gerenciador.indicators.length; i++) {
						var indicator = Gerenciador.indicators[i];
						for(var j = 0; j < indicator.regras.length; j++) {
							var regra = indicator.regras[j];
							if(regra.infoPropriedade === record.get(me.valueField)) {
								Ext.Msg.alert('Erro', 'Esta propriedade está sendo utilizado em uma ou mais regras');
								return false;
							}
						}
					}
				},
				'select': function(me, records) {
					Gerenciador.logProperties = Ext.Array.pluck(records, 'data');
					updateHelpPanel();
				}
			}
		});

		var infoPanel = Ext.create('Ext.form.FieldContainer', {
			flex: 1,
			fieldDefaults: {
				labelAlign: 'right',
				width: '100%'
			},
			items: [serverComboBox, logDirectoryText, logFormatTag]
		});

		var helpPanel = Ext.create('Ext.panel.Panel', {
			flex: .6,
			margin: '0 10px'
		});

		this.items = [infoPanel, helpPanel];

		this.on('afterrender', function() {
			logFormatStore.load({
				callback: function() {
					serverStore.load({
						callback: function() {
							serverComboBox.setValue(Gerenciador.server);		
							logDirectoryText.setValue(Gerenciador.logDirectory);

							var logFormatRecords = [];
							Ext.Array.forEach(Gerenciador.logProperties, function(rec) {
								var idx = logFormatTag.getStore().findBy(function(format) {
									return format.data.infoPropriedade === rec.infoPropriedade
									&& format.data.tipoValor === rec.tipoValor
									&& format.data[Gerenciador.server] === rec[Gerenciador.server];
								});

								if(idx !== -1)
									logFormatRecords.push(logFormatTag.getStore().getAt(idx));
							});
							logFormatTag.select(logFormatRecords);
							logFormatTag.fireEvent('select', logFormatTag, logFormatRecords);
						}				
					});
				}
			});

		});

		this.callParent();
	}
});